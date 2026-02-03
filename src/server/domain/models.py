"""
Pydantic models for the Copilot SDK UI Python server.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field
import uuid


class Message(BaseModel):
    """A chat message."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class Session(BaseModel):
    """A chat session."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "New Chat"
    messages: list[Message] = Field(default_factory=list)
    workspace: str = ""
    created_at: datetime = Field(default_factory=datetime.now)
    copilot_session_id: Optional[str] = None
    model: str = "claude-sonnet-4"


class SessionCreate(BaseModel):
    """Request body for creating a session."""
    name: Optional[str] = None
    workspace: Optional[str] = None
    model: Optional[str] = None


class SessionInfo(BaseModel):
    """Summary info for a session."""
    id: str
    name: str
    workspace: str
    message_count: int
    created_at: datetime
    model: str


class ModelInfo(BaseModel):
    """Information about an AI model."""
    id: str
    name: str
    provider: str


class ModelsResponse(BaseModel):
    """Response for models endpoint."""
    models: list[ModelInfo]
    current: str


class Skill(BaseModel):
    """A skill definition."""
    name: str
    description: str
    path: str


class MCPServer(BaseModel):
    """An MCP server configuration."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    command: str
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    enabled: bool = False
    status: Literal["running", "stopped", "error"] = "stopped"


class MCPServerCreate(BaseModel):
    """Request body for creating an MCP server."""
    name: str
    command: str
    args: Optional[list[str]] = None
    env: Optional[dict[str, str]] = None


class Permissions(BaseModel):
    """Permission settings."""
    allow_all_tools: bool = False
    allow_all_paths: bool = False
    allow_all_urls: bool = False
    no_ask_user: bool = False
    disable_parallel_tools: bool = False


class AppSettings(BaseModel):
    """Application settings."""
    theme: Literal["auto", "dark", "light"] = "dark"
    streaming: bool = True
    log_level: Literal["debug", "info", "warn", "error"] = "info"
    permissions: Permissions = Field(default_factory=Permissions)


class Plan(BaseModel):
    """A plan for a session."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "Untitled Plan"
    content: str = ""
    status: Literal["draft", "active", "completed"] = "draft"
    created_at: datetime = Field(default_factory=datetime.now)


class PlanCreate(BaseModel):
    """Request body for creating a plan."""
    title: Optional[str] = None
    content: str


class WorkspaceResponse(BaseModel):
    """Response for workspace endpoint."""
    workspace: str
    root: Optional[str] = None
    subdirectories: Optional[list[str]] = None


class WorkspaceUpdate(BaseModel):
    """Request body for updating workspace."""
    workspace: str


class WorkspaceCreate(BaseModel):
    """Request body for creating a new workspace."""
    name: str


class InstructionsResponse(BaseModel):
    """Response for instructions endpoint."""
    content: str
    path: str


class InstructionsUpdate(BaseModel):
    """Request body for updating instructions."""
    content: str


class FileEntry(BaseModel):
    """A file or directory entry."""
    name: str
    type: Literal["file", "directory"]
    path: str


class ReviewResult(BaseModel):
    """A code review result for a file."""
    file: str
    status: Literal["ok", "warning", "error"]
    issues: list[str] = Field(default_factory=list)


class ReviewSummary(BaseModel):
    """Summary of code review."""
    total: int
    warnings: int
    errors: int


class ReviewResponse(BaseModel):
    """Response for code review endpoint."""
    results: list[ReviewResult]
    summary: ReviewSummary


# WebSocket message types
class WSMessage(BaseModel):
    """Base WebSocket message."""
    type: str


class WSChatMessage(WSMessage):
    """Chat message from client."""
    type: Literal["message"] = "message"
    content: str


class WSSetModel(WSMessage):
    """Set model message from client."""
    type: Literal["set_model"] = "set_model"
    model: str


class WSCancel(WSMessage):
    """Cancel message from client."""
    type: Literal["cancel"] = "cancel"


class WSExecute(WSMessage):
    """Execute command message from client."""
    type: Literal["execute"] = "execute"
    command: str
