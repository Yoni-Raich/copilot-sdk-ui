import asyncio
import json
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from copilot.generated.session_events import SessionEventType
from domain.interfaces import SessionRepository, CopilotService, WorkspaceService, FileAttachmentRepository, MCPService
from domain.models import Session, Message
from api.deps import get_session_repo, get_copilot_service, get_workspace_service, get_global_state, get_file_attachment_repo, get_mcp_service, GlobalState

router = APIRouter()


def _build_mcp_config(servers) -> dict:
    """Convert MCPServer models to SDK mcp_servers config dict."""
    result = {}
    for s in servers:
        config = {
            "type": "local",
            "command": s.command,
            "args": s.args,
            "tools": ["*"],
        }
        if s.env:
            config["env"] = s.env
        result[s.name] = config
    return result


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
    session_repo: SessionRepository = Depends(get_session_repo),
    copilot_service: CopilotService = Depends(get_copilot_service),
    workspace_service: WorkspaceService = Depends(get_workspace_service),
    file_attachment_repo: FileAttachmentRepository = Depends(get_file_attachment_repo),
    mcp_service: MCPService = Depends(get_mcp_service),
    state: GlobalState = Depends(get_global_state),
):
    await websocket.accept()

    # Get or create session
    session = await session_repo.get(session_id)
    if not session:
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

                # Retrieve file attachments
                attachments = []
                if attachment_ids:
                    for file_id in attachment_ids:
                        attachment = await file_attachment_repo.get(file_id)
                        if attachment:
                            attachments.append(attachment)

                # Create user message
                user_msg = Message(role="user", content=content, attachments=attachments)
                session.messages.append(user_msg)

                # Update session name from first message
                if len(session.messages) == 1:
                    session.name = content[:50] + ("..." if len(content) > 50 else "")

                await session_repo.save(session)

                await websocket.send_json({
                    "type": "user_message",
                    "message": user_msg.model_dump(mode="json"),
                })

                try:
                    effective_workspace = session.workspace or workspace_service.get_current()

                    # Try to resume existing SDK session, otherwise create new
                    sdk_session = copilot_service.get_active_session(session_id)
                    if sdk_session:
                        try:
                            sdk_session = await copilot_service.resume_session(session_id)
                        except Exception:
                            # Session expired or invalid, create new one
                            sdk_session = None

                    if not sdk_session:
                        # Build MCP servers config from enabled MCP servers
                        enabled_servers = await mcp_service.get_enabled()
                        mcp_config = _build_mcp_config(enabled_servers) if enabled_servers else None

                        # Get instructions
                        system_msg = None
                        try:
                            instructions = await workspace_service.get_instructions()
                            if instructions and instructions.content:
                                system_msg = instructions.content
                        except Exception:
                            pass

                        sdk_session = await copilot_service.create_session(
                            model=session.model,
                            workspace=effective_workspace,
                            session_id=session_id,
                            mcp_servers=mcp_config,
                            system_message=system_msg,
                        )

                    # Set up event handling with an asyncio Event to detect completion
                    assistant_content = []
                    tool_calls = []
                    current_turn = [0]
                    done_event = asyncio.Event()
                    error_holder = [None]

                    def handle_event(event):
                        nonlocal assistant_content, tool_calls

                        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
                            delta = event.data.delta_content or ""
                            assistant_content.append(delta)
                            asyncio.create_task(websocket.send_json({
                                "type": "stream",
                                "content": delta,
                            }))

                        elif event.type == SessionEventType.ASSISTANT_REASONING_DELTA:
                            delta = event.data.delta_content or ""
                            asyncio.create_task(websocket.send_json({
                                "type": "reasoning",
                                "content": delta,
                            }))

                        elif event.type == SessionEventType.ASSISTANT_TURN_START:
                            current_turn[0] += 1
                            asyncio.create_task(websocket.send_json({
                                "type": "turn_start",
                                "turn": current_turn[0],
                            }))

                        elif event.type == SessionEventType.ASSISTANT_TURN_END:
                            asyncio.create_task(websocket.send_json({
                                "type": "turn_end",
                                "turn": current_turn[0],
                            }))

                        elif event.type == SessionEventType.TOOL_EXECUTION_START:
                            tool_name = event.data.tool_name or "unknown"
                            args = event.data.arguments
                            tool_id = event.data.tool_call_id or tool_name
                            args_str = json.dumps(args) if isinstance(args, (dict, list)) else str(args) if args else ""

                            tool_calls.append({
                                "id": tool_id,
                                "name": tool_name,
                                "arguments": args_str,
                                "status": "running",
                                "result": None,
                            })

                            asyncio.create_task(websocket.send_json({
                                "type": "tool_start",
                                "tool": tool_name,
                                "tool_id": tool_id,
                                "arguments": args_str,
                            }))

                        elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
                            tool_name = event.data.tool_name or "unknown"
                            tool_id = event.data.tool_call_id or tool_name
                            result = event.data.content if hasattr(event.data, "content") else None

                            # Update tool call status
                            for tc in tool_calls:
                                if tc["id"] == tool_id:
                                    tc["status"] = "complete"
                                    tc["result"] = result
                                    break

                            asyncio.create_task(websocket.send_json({
                                "type": "tool_complete",
                                "tool": tool_name,
                                "tool_id": tool_id,
                                "result": result,
                            }))

                        elif event.type == SessionEventType.SESSION_ERROR:
                            error_msg = event.data.message or "Unknown error"
                            error_holder[0] = error_msg
                            asyncio.create_task(websocket.send_json({
                                "type": "error",
                                "error": error_msg,
                            }))
                            done_event.set()

                        elif event.type == SessionEventType.SESSION_IDLE:
                            done_event.set()

                        elif event.type == SessionEventType.ABORT:
                            done_event.set()

                    unsubscribe = sdk_session.on(handle_event)

                    # Prepare SDK attachments
                    sdk_attachments = []
                    if attachments:
                        for att in attachments:
                            sdk_attachments.append({
                                "type": "file",
                                "path": att.path,
                                "displayName": att.original_filename,
                            })

                    # Send message — SDK handles multi-turn history automatically
                    message_options = {"prompt": content}
                    if sdk_attachments:
                        message_options["attachments"] = sdk_attachments

                    await sdk_session.send(message_options)

                    # Wait for completion (SESSION_IDLE or error)
                    try:
                        await asyncio.wait_for(done_event.wait(), timeout=300)
                    except asyncio.TimeoutError:
                        await websocket.send_json({
                            "type": "error",
                            "error": "Request timed out after 5 minutes",
                        })

                    unsubscribe()

                    # Store assistant message
                    full_content = "".join(assistant_content)
                    assistant_msg = Message(
                        role="assistant",
                        content=full_content,
                    )
                    session.messages.append(assistant_msg)
                    await session_repo.save(session)

                    await websocket.send_json({
                        "type": "complete",
                        "message": assistant_msg.model_dump(mode="json"),
                        "tool_calls": tool_calls,
                    })

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "error": str(e),
                    })

            elif msg_type == "cancel":
                sdk_session = copilot_service.get_active_session(session_id)
                if sdk_session:
                    try:
                        await sdk_session.abort()
                    except Exception:
                        pass
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
        pass  # Session stays active for resume
