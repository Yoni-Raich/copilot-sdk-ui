import asyncio
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from copilot.generated.session_events import SessionEventType
from domain.interfaces import SessionRepository, CopilotService, WorkspaceService, FileAttachmentRepository
from domain.models import Session, Message
from api.deps import get_session_repo, get_copilot_service, get_workspace_service, get_global_state, get_file_attachment_repo, GlobalState

router = APIRouter()

@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket, 
    session_id: str,
    session_repo: SessionRepository = Depends(get_session_repo),
    copilot_service: CopilotService = Depends(get_copilot_service),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    file_attachment_repo: FileAttachmentRepository = Depends(get_file_attachment_repo),
    state: GlobalState = Depends(get_global_state)
):
    await websocket.accept()
    
    # Get or create session
    session = await session_repo.get(session_id)
    if not session:
        # Default workspace and model
        current_workspace = workspace_service.get_current()
        current_model = state.current_model
        
        session = Session(
            id=session_id,
            workspace=current_workspace,
            model=current_model,
        )
        await session_repo.save(session)
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "set_model":
                session.model = data.get("model", session.model)
                await session_repo.save(session)
                await websocket.send_json({"type": "model_set", "model": session.model})
            
            elif msg_type == "message":
                content = data.get("content", "")
                attachment_ids = data.get("attachment_ids", [])
                
                # Retrieve file attachments from repository
                attachments = []
                if attachment_ids:
                    for file_id in attachment_ids:
                        attachment = await file_attachment_repo.get(file_id)
                        if attachment:
                            attachments.append(attachment)
                
                # Create user message with attachments
                user_msg = Message(role="user", content=content, attachments=attachments)
                session.messages.append(user_msg)
                
                # Update session name if first message
                if len(session.messages) == 1:
                    session.name = content[:50] + ("..." if len(content) > 50 else "")
                
                await session_repo.save(session)
                
                await websocket.send_json({
                    "type": "user_message",
                    "message": user_msg.model_dump(mode="json"),
                })
                
                # Create Copilot SDK session
                try:
                    # Use session workspace, fallback to current workspace if empty
                    effective_workspace = session.workspace or workspace_service.get_current()
                    
                    # Get skill directories for the effective workspace
                    skill_dirs = await workspace_service.get_skill_directories(effective_workspace)
                    
                    sdk_session = await copilot_service.create_session(
                        model=session.model,
                        workspace=effective_workspace,
                        session_id=session_id,
                        skill_directories=skill_dirs if skill_dirs else None
                    )
                    
                    assistant_content = []
                    
                    def handle_event(event):
                        """Handle streaming events from Copilot SDK."""
                        nonlocal assistant_content
                        
                        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
                            delta = event.data.delta_content or ""
                            assistant_content.append(delta)
                            asyncio.create_task(websocket.send_json({
                                "type": "stream",
                                "content": delta,
                            }))
                        
                        elif event.type == SessionEventType.TOOL_EXECUTION_START:
                            tool_name = event.data.tool_name or "unknown"
                            args = event.data.arguments
                            
                            # Append tool start log to content for persistence
                            # Using blockquotes for UI container styling
                            log_entry = f"\n\n> 🔧 **Tool Call:** `{tool_name}`\n> \n> Arguments:\n> ```json\n> {args}\n> ```\n\n"
                            assistant_content.append(log_entry)
                            
                            asyncio.create_task(websocket.send_json({
                                "type": "tool_start",
                                "tool": tool_name,
                                "arguments": args,
                            }))
                        
                        elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
                            tool_name = event.data.tool_name or "unknown"
                            result = event.data.result
                            
                            # Append tool complete log
                            log_entry = f"\n\n> ✅ **Tool Result:** `{tool_name}`\n\n"
                            assistant_content.append(log_entry)
                            
                            asyncio.create_task(websocket.send_json({
                                "type": "tool_complete",
                                "tool": tool_name,
                                "result": result.content if result else None,
                            }))
                    
                    sdk_session.on(handle_event)
                    
                    # Build prompt with conversation history
                    history = session.messages[:-1]  # Exclude current message
                    if history:
                        history_text = "\n\n".join([
                            f"{'Human' if m.role == 'user' else 'Assistant'}: {m.content[:2000]}"
                            for m in history
                        ])
                        full_prompt = f"Conversation history:\n\n{history_text}\n\nHuman: {content}\n\nRespond to my latest message."
                    else:
                        full_prompt = content
                    
                    # Prepare SDK attachments from file attachments
                    sdk_attachments = []
                    if attachments:
                        for attachment in attachments:
                            sdk_attachments.append({
                                "type": "file",
                                "path": attachment.path,
                                "displayName": attachment.original_filename
                            })
                    
                    # Send message with attachments to SDK
                    message_options = {"prompt": full_prompt}
                    if sdk_attachments:
                        message_options["attachments"] = sdk_attachments
                    
                    await sdk_session.send_and_wait(message_options)
                    
                    # Create assistant message
                    assistant_msg = Message(
                        role="assistant",
                        content="".join(assistant_content),
                    )
                    session.messages.append(assistant_msg)
                    await session_repo.save(session)
                    
                    await websocket.send_json({
                        "type": "complete",
                        "message": assistant_msg.model_dump(mode="json"),
                    })
                    
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": str(e),
                    })
            
            elif msg_type == "cancel":
                copilot_service.remove_active_session(session_id)
                await websocket.send_json({"type": "cancelled"})
            
            elif msg_type == "execute":
                command = data.get("command", "")
                try:
                    result = await workspace_service.execute_command(command, session.workspace)
                    if result["stdout"]:
                        await websocket.send_json({"type": "exec_output", "content": result["stdout"]})
                    if result["stderr"]:
                        await websocket.send_json({"type": "exec_error", "content": result["stderr"]})
                    await websocket.send_json({"type": "exec_complete", "code": result["returncode"]})
                except Exception as e:
                    await websocket.send_json({"type": "exec_error", "content": str(e)})
    
    except WebSocketDisconnect:
        copilot_service.remove_active_session(session_id)
