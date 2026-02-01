"""
Copilot SDK UI - Python FastAPI Server

This server replaces the Node.js Express server, providing:
- REST API endpoints for models, sessions, workspace, settings, MCP
- WebSocket chat with streaming using GitHub Copilot SDK
"""

import asyncio
import os
import re
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from copilot import CopilotClient
from copilot.generated.session_events import SessionEventType

from models import (
    Session, SessionCreate, SessionInfo, Message,
    ModelInfo, ModelsResponse,
    Skill, MCPServer, MCPServerCreate,
    AppSettings, Permissions,
    Plan, PlanCreate,
    WorkspaceResponse, WorkspaceUpdate, WorkspaceCreate,
    InstructionsResponse, InstructionsUpdate,
    FileEntry, ReviewResult, ReviewSummary, ReviewResponse,
)

# Initialize FastAPI app
app = FastAPI(title="Copilot SDK UI Server", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
sessions: dict[str, Session] = {}
mcp_servers: dict[str, MCPServer] = {}
session_plans: dict[str, list[Plan]] = {}
app_settings = AppSettings()

# Workspaces configuration
WORKSPACES_ROOT = os.environ.get("COPILOT_WORKSPACES_ROOT", str(Path.home() / "Documents" / "CopilotWorkspaces"))
if not os.path.exists(WORKSPACES_ROOT):
    try:
        os.makedirs(WORKSPACES_ROOT, exist_ok=True)
    except Exception:
        # Fallback to CWD if we can't create the directory
        WORKSPACES_ROOT = os.getcwd()

current_workspace: str = WORKSPACES_ROOT
current_model: str = "claude-sonnet-4"

DEFAULT_INSTRUCTIONS = """# Copilot Instructions

You are an AI assistant helping with software development in this workspace.

## Guidelines
- Be concise and helpful.
- Follow the coding standards of the project.
- When generating code, include brief explanations.
"""

# Copilot client (initialized on startup)
copilot_client: Optional[CopilotClient] = None
copilot_sessions: dict[str, any] = {}  # Map session_id to SDK session


# ============================================================================
# Startup / Shutdown
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize Copilot client on server startup."""
    print("DEBUG: Starting up server...")
    global copilot_client
    try:
        copilot_client = CopilotClient()
        print("DEBUG: CopilotClient initialized. Calling start()...")
        await copilot_client.start()
        print("DEBUG: CopilotClient started successfully.")
    except Exception as e:
        print(f"ERROR: Failed to start CopilotClient: {e}")
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║            Copilot SDK UI Server (Python)                ║
╠══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:3001                 ║
║  Workspace: {current_workspace[:40]:<40}  ║
║  Default Model: {current_model:<36}  ║
║                                                          ║
║  Using GitHub Copilot SDK (Python)                       ║
╚══════════════════════════════════════════════════════════╝
    """)


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up Copilot client on shutdown."""
    global copilot_client
    if copilot_client:
        await copilot_client.stop()


# ============================================================================
# Models API
# ============================================================================

@app.get("/api/models", response_model=ModelsResponse)
async def get_models():
    """Get available models from SDK."""
    global copilot_client
    
    # Try to get models from SDK
    try:
        sdk_models = await copilot_client.list_models()
        models = [ModelInfo(id=m.get("id", m), name=m.get("name", m), provider=m.get("provider", "Unknown")) 
                  for m in sdk_models] if sdk_models else []
    except Exception:
        # Fallback to default models
        models = [
            ModelInfo(id="claude-sonnet-4", name="Claude Sonnet 4", provider="Anthropic"),
            ModelInfo(id="claude-sonnet-4.5", name="Claude Sonnet 4.5", provider="Anthropic"),
            ModelInfo(id="gpt-4.1", name="GPT-4.1", provider="OpenAI"),
            ModelInfo(id="gpt-5", name="GPT-5", provider="OpenAI"),
            ModelInfo(id="gemini-3-pro-preview", name="Gemini 3 Pro Preview", provider="Google"),
        ]
    
    return ModelsResponse(models=models, current=current_model)


@app.post("/api/models")
async def set_model(data: dict):
    """Set the current model."""
    global current_model
    model = data.get("model")
    if model:
        current_model = model
        return {"model": current_model}
    raise HTTPException(status_code=400, detail="Invalid model")


# ============================================================================
# Sessions API
# ============================================================================

@app.get("/api/sessions", response_model=list[SessionInfo])
async def get_sessions():
    """List all sessions."""
    return [
        SessionInfo(
            id=s.id,
            name=s.name,
            workspace=s.workspace,
            message_count=len(s.messages),
            created_at=s.created_at,
            model=s.model,
        )
        for s in sessions.values()
    ]


@app.post("/api/sessions", response_model=Session)
async def create_session(data: SessionCreate):
    """Create a new session."""
    session = Session(
        id=str(uuid.uuid4()),
        name=data.name or "New Chat",
        workspace=data.workspace or current_workspace,
        model=data.model or current_model,
    )
    sessions[session.id] = session
    return session


@app.get("/api/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """Get a specific session."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    if session_id in copilot_sessions:
        del copilot_sessions[session_id]
    if session_id in sessions:
        del sessions[session_id]
    return {"success": True}


@app.get("/api/session/{session_id}/info")
async def get_session_info(session_id: str):
    """Get session info."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = sessions[session_id]
    return {
        "id": s.id,
        "name": s.name,
        "copilotSessionId": s.copilot_session_id,
        "createdAt": s.created_at.isoformat(),
        "workspace": s.workspace,
        "model": s.model,
        "messageCount": len(s.messages),
    }


@app.patch("/api/session/{session_id}")
async def update_session(session_id: str, data: dict):
    """Update session name."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    if "name" in data:
        sessions[session_id].name = data["name"]
    return sessions[session_id]


# ============================================================================
# Skills API
# ============================================================================

async def get_skills_from_workspace(workspace: str) -> list[Skill]:
    """Read skills from .claude/skills directory."""
    skills_dir = Path(workspace) / ".claude" / "skills"
    skills = []
    
    if not skills_dir.exists():
        return skills
    
    for entry in skills_dir.iterdir():
        if entry.is_dir():
            skill_path = entry / "SKILL.md"
            if skill_path.exists():
                try:
                    content = skill_path.read_text(encoding="utf-8")
                    frontmatter_match = re.match(r"^---\n([\s\S]*?)\n---", content)
                    if frontmatter_match:
                        frontmatter = frontmatter_match.group(1)
                        name_match = re.search(r"name:\s*(.+)", frontmatter)
                        desc_match = re.search(r"description:\s*(.+)", frontmatter)
                        skills.append(Skill(
                            name=name_match.group(1) if name_match else entry.name,
                            description=desc_match.group(1) if desc_match else "No description",
                            path=str(skill_path),
                        ))
                except Exception:
                    pass
    
    return skills


@app.get("/api/skills", response_model=list[Skill])
async def get_skills(workspace: Optional[str] = None):
    """Get skills from workspace."""
    return await get_skills_from_workspace(workspace or current_workspace)


# ============================================================================
# Workspace API
# ============================================================================

@app.get("/api/workspace", response_model=WorkspaceResponse)
async def get_workspace():
    """Get current workspace and list available workspaces in root."""
    subdirectories = []
    root_path = Path(WORKSPACES_ROOT)
    
    if root_path.exists():
        try:
            subdirectories = [
                d.name for d in root_path.iterdir() 
                if d.is_dir() and not d.name.startswith('.')
            ]
        except Exception:
            pass
            
    return WorkspaceResponse(
        workspace=current_workspace,
        root=WORKSPACES_ROOT,
        subdirectories=sorted(subdirectories)
    )


@app.post("/api/workspace", response_model=WorkspaceResponse)
async def set_workspace(data: WorkspaceUpdate):
    """Set current workspace."""
    global current_workspace
    
    # Allow absolute paths or names relative to ROOT
    target_path = Path(data.workspace)
    if not target_path.is_absolute():
         target_path = Path(WORKSPACES_ROOT) / data.workspace
         
    if target_path.exists() and target_path.is_dir():
        current_workspace = str(target_path.resolve())
        # Return updated info
        return await get_workspace()
        
    raise HTTPException(status_code=400, detail="Directory does not exist")


@app.post("/api/workspaces/create", response_model=WorkspaceResponse)
async def create_workspace(data: WorkspaceCreate):
    """Create a new workspace directory."""
    global current_workspace
    
    # Sanitize name to prevent path traversal
    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '', data.name)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid workspace name")
        
    new_path = Path(WORKSPACES_ROOT) / safe_name
    
    try:
        new_path.mkdir(parents=True, exist_ok=True)
        
        # Create default instructions
        github_dir = new_path / ".github"
        github_dir.mkdir(exist_ok=True)
        instructions_path = github_dir / "copilot-instructions.md"
        instructions_path.write_text(DEFAULT_INSTRUCTIONS, encoding="utf-8")
        
        current_workspace = str(new_path.resolve())
        return await get_workspace()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/workspace/instructions", response_model=InstructionsResponse)
async def get_instructions():
    """Get content of .github/copilot-instructions.md."""
    instructions_path = Path(current_workspace) / ".github" / "copilot-instructions.md"
    content = ""
    
    if instructions_path.exists():
        try:
            content = instructions_path.read_text(encoding="utf-8")
        except Exception:
            pass
            
    return InstructionsResponse(content=content, path=str(instructions_path))


@app.post("/api/workspace/instructions", response_model=InstructionsResponse)
async def save_instructions(data: InstructionsUpdate):
    """Save content to .github/copilot-instructions.md."""
    github_dir = Path(current_workspace) / ".github"
    instructions_path = github_dir / "copilot-instructions.md"
    
    try:
        github_dir.mkdir(exist_ok=True)
        instructions_path.write_text(data.content, encoding="utf-8")
        return InstructionsResponse(content=data.content, path=str(instructions_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/files", response_model=list[FileEntry])
async def get_files(path: Optional[str] = None):
    """List files in directory."""
    dir_path = Path(path or current_workspace)
    if not dir_path.exists():
        raise HTTPException(status_code=404, detail="Directory not found")
    
    entries = []
    for entry in dir_path.iterdir():
        entries.append(FileEntry(
            name=entry.name,
            type="directory" if entry.is_dir() else "file",
            path=str(entry),
        ))
    return entries


@app.get("/api/file")
async def get_file(path: str):
    """Read file content."""
    file_path = Path(path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    try:
        content = file_path.read_text(encoding="utf-8")
        return {"content": content, "path": str(file_path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/file")
async def write_file(data: dict):
    """Write file content."""
    file_path = Path(data.get("path", ""))
    content = data.get("content", "")
    try:
        file_path.write_text(content, encoding="utf-8")
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Settings API
# ============================================================================

@app.get("/api/settings", response_model=AppSettings)
async def get_settings():
    """Get application settings."""
    return app_settings


@app.post("/api/settings", response_model=AppSettings)
async def update_settings(data: dict):
    """Update application settings."""
    global app_settings
    for key, value in data.items():
        if hasattr(app_settings, key):
            setattr(app_settings, key, value)
    return app_settings


# ============================================================================
# MCP Servers API
# ============================================================================

@app.get("/api/mcp/servers", response_model=list[MCPServer])
async def get_mcp_servers():
    """List MCP servers."""
    return list(mcp_servers.values())


@app.post("/api/mcp/servers", response_model=MCPServer)
async def create_mcp_server(data: MCPServerCreate):
    """Create an MCP server."""
    server = MCPServer(
        id=str(uuid.uuid4()),
        name=data.name,
        command=data.command,
        args=data.args or [],
        env=data.env or {},
    )
    mcp_servers[server.id] = server
    return server


@app.patch("/api/mcp/servers/{server_id}", response_model=MCPServer)
async def update_mcp_server(server_id: str, data: dict):
    """Update an MCP server."""
    if server_id not in mcp_servers:
        raise HTTPException(status_code=404, detail="Server not found")
    server = mcp_servers[server_id]
    for key in ["enabled", "name", "command", "args", "env"]:
        if key in data:
            setattr(server, key, data[key])
    server.status = "running" if server.enabled else "stopped"
    return server


@app.delete("/api/mcp/servers/{server_id}")
async def delete_mcp_server(server_id: str):
    """Delete an MCP server."""
    if server_id in mcp_servers:
        del mcp_servers[server_id]
    return {"success": True}


# ============================================================================
# Plans API
# ============================================================================

@app.get("/api/session/{session_id}/plan")
async def get_active_plan(session_id: str):
    """Get active plan for session."""
    plans = session_plans.get(session_id, [])
    active = next((p for p in plans if p.status in ["active", "draft"]), None)
    if active:
        return active
    raise HTTPException(status_code=404, detail="No active plan")


@app.post("/api/session/{session_id}/plan", response_model=Plan)
async def create_plan(session_id: str, data: PlanCreate):
    """Create a plan for session."""
    plan = Plan(
        title=data.title or "Untitled Plan",
        content=data.content,
    )
    if session_id not in session_plans:
        session_plans[session_id] = []
    # Mark previous plans as completed
    for p in session_plans[session_id]:
        if p.status != "completed":
            p.status = "completed"
    session_plans[session_id].insert(0, plan)
    return plan


@app.get("/api/session/{session_id}/plans", response_model=list[Plan])
async def get_plans(session_id: str):
    """Get all plans for session."""
    return session_plans.get(session_id, [])


@app.delete("/api/session/{session_id}/plans/{plan_id}")
async def delete_plan(session_id: str, plan_id: str):
    """Delete a plan."""
    if session_id in session_plans:
        session_plans[session_id] = [p for p in session_plans[session_id] if p.id != plan_id]
    return {"success": True}


# ============================================================================
# Context API
# ============================================================================

@app.get("/api/context")
async def get_context(sessionId: Optional[str] = None):
    """Get context usage for session."""
    message_tokens = 0
    if sessionId and sessionId in sessions:
        for msg in sessions[sessionId].messages:
            message_tokens += len(msg.content) // 4  # Rough estimate
    
    return {
        "totalTokens": message_tokens + 3500,
        "maxTokens": 128000,
        "breakdown": {
            "systemPrompt": 2500,
            "messages": message_tokens,
            "files": 0,
            "tools": 500,
            "other": 500,
        },
        "compactSuggested": message_tokens > 80000,
    }


# ============================================================================
# Code Review API
# ============================================================================

@app.post("/api/review", response_model=ReviewResponse)
async def code_review(data: dict):
    """Run code review (git status based)."""
    workspace = data.get("workspace", current_workspace)
    
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=workspace,
            capture_output=True,
            text=True,
            shell=True,
        )
        lines = result.stdout.strip().split("\n") if result.stdout.strip() else []
        
        results = []
        for line in lines:
            if line:
                status = line[:2]
                file = line[3:]
                results.append(ReviewResult(
                    file=file,
                    status="warning" if "M" in status else "ok",
                    issues=[],
                ))
        
        return ReviewResponse(
            results=results,
            summary=ReviewSummary(
                total=len(results),
                warnings=len([r for r in results if r.status == "warning"]),
                errors=0,
            ),
        )
    except Exception:
        return ReviewResponse(
            results=[],
            summary=ReviewSummary(total=0, warnings=0, errors=0),
        )


# ============================================================================
# WebSocket Chat
# ============================================================================

@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for chat with streaming."""
    await websocket.accept()
    
    # Get or create session
    if session_id not in sessions:
        sessions[session_id] = Session(
            id=session_id,
            workspace=current_workspace,
            model=current_model,
        )
    
    session = sessions[session_id]
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "set_model":
                session.model = data.get("model", session.model)
                await websocket.send_json({"type": "model_set", "model": session.model})
            
            elif msg_type == "message":
                content = data.get("content", "")
                
                # Create user message
                user_msg = Message(role="user", content=content)
                session.messages.append(user_msg)
                
                # Update session name if first message
                if len(session.messages) == 1:
                    session.name = content[:50] + ("..." if len(content) > 50 else "")
                
                await websocket.send_json({
                    "type": "user_message",
                    "message": user_msg.model_dump(mode="json"),
                })
                
                # Create Copilot SDK session
                try:
                    sdk_session = await copilot_client.create_session({
                        "model": session.model,
                        "streaming": True,
                        "working_directory": session.workspace,  # Correct parameter found via introspection
                    })
                    
                    copilot_sessions[session_id] = sdk_session
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
                            asyncio.create_task(websocket.send_json({
                                "type": "tool_start",
                                "tool": tool_name,
                                "arguments": args,
                            }))
                        
                        elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
                            tool_name = event.data.tool_name or "unknown"
                            result = event.data.result
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
                    
                    await sdk_session.send_and_wait({"prompt": full_prompt})
                    
                    # Create assistant message
                    assistant_msg = Message(
                        role="assistant",
                        content="".join(assistant_content),
                    )
                    session.messages.append(assistant_msg)
                    
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
                if session_id in copilot_sessions:
                    del copilot_sessions[session_id]
                await websocket.send_json({"type": "cancelled"})
            
            elif msg_type == "execute":
                command = data.get("command", "")
                try:
                    result = subprocess.run(
                        command,
                        cwd=session.workspace,
                        shell=True,
                        capture_output=True,
                        text=True,
                    )
                    if result.stdout:
                        await websocket.send_json({"type": "exec_output", "content": result.stdout})
                    if result.stderr:
                        await websocket.send_json({"type": "exec_error", "content": result.stderr})
                    await websocket.send_json({"type": "exec_complete", "code": result.returncode})
                except Exception as e:
                    await websocket.send_json({"type": "exec_error", "content": str(e)})
    
    except WebSocketDisconnect:
        if session_id in copilot_sessions:
            del copilot_sessions[session_id]


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
