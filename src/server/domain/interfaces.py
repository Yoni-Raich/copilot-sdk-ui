from abc import ABC, abstractmethod
from typing import List, Optional, AsyncIterator, Dict, Any
from .models import (
    Session, SessionCreate, SessionInfo,
    ModelInfo, Skill, MCPServer, MCPServerCreate,
    AppSettings, Plan, PlanCreate,
    WorkspaceResponse, FileEntry, ReviewResponse,
    InstructionsResponse
)

class SessionRepository(ABC):
    @abstractmethod
    async def get(self, session_id: str) -> Optional[Session]: ...
    
    @abstractmethod
    async def save(self, session: Session) -> Session: ...
    
    @abstractmethod
    async def delete(self, session_id: str) -> bool: ...
    
    @abstractmethod
    async def list(self) -> List[SessionInfo]: ...
    
    @abstractmethod
    async def create(self, data: SessionCreate) -> Session: ...

class PlanRepository(ABC):
    @abstractmethod
    async def get_active(self, session_id: str) -> Optional[Plan]: ...
    
    @abstractmethod
    async def list(self, session_id: str) -> List[Plan]: ...
    
    @abstractmethod
    async def create(self, session_id: str, data: PlanCreate) -> Plan: ...
    
    @abstractmethod
    async def delete(self, session_id: str, plan_id: str) -> bool: ...

class WorkspaceService(ABC):
    @abstractmethod
    def get_current(self) -> str: ...
    
    @abstractmethod
    async def set_current(self, path: str) -> WorkspaceResponse: ...
    
    @abstractmethod
    async def get_info(self) -> WorkspaceResponse: ...
    
    @abstractmethod
    async def create(self, name: str) -> WorkspaceResponse: ...
    
    @abstractmethod
    async def list_files(self, path: Optional[str] = None) -> List[FileEntry]: ...
    
    @abstractmethod
    async def read_file(self, path: str) -> str: ...
    
    @abstractmethod
    async def write_file(self, path: str, content: str) -> bool: ...
    
    @abstractmethod
    async def get_instructions(self) -> InstructionsResponse: ...
    
    @abstractmethod
    async def save_instructions(self, content: str) -> InstructionsResponse: ...
    
    @abstractmethod
    async def get_skills(self) -> List[Skill]: ...
    
    @abstractmethod
    async def run_review(self, workspace: Optional[str] = None) -> ReviewResponse: ...

    @abstractmethod
    async def execute_command(self, command: str, cwd: Optional[str] = None) -> Any: ...

class SettingsService(ABC):
    @abstractmethod
    async def get(self) -> AppSettings: ...
    
    @abstractmethod
    async def update(self, data: Dict[str, Any]) -> AppSettings: ...

class MCPService(ABC):
    @abstractmethod
    async def list(self) -> List[MCPServer]: ...
    
    @abstractmethod
    async def create(self, data: MCPServerCreate) -> MCPServer: ...
    
    @abstractmethod
    async def update(self, server_id: str, data: Dict[str, Any]) -> Optional[MCPServer]: ...
    
    @abstractmethod
    async def delete(self, server_id: str) -> bool: ...

class CopilotService(ABC):
    @abstractmethod
    async def start(self): ...
    
    @abstractmethod
    async def stop(self): ...
    
    @abstractmethod
    async def list_models(self) -> List[ModelInfo]: ...
    
    @abstractmethod
    async def create_session(self, model: str, workspace: str) -> Any: ...
