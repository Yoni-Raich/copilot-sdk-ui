from infrastructure.repositories import InMemorySessionRepository, InMemoryPlanRepository
from infrastructure.workspace import FileSystemWorkspaceService
from infrastructure.copilot import CopilotClientService
from infrastructure.settings import InMemorySettingsService
from infrastructure.mcp import InMemoryMCPService

# Singletons
session_repo = InMemorySessionRepository()
plan_repo = InMemoryPlanRepository()
workspace_service = FileSystemWorkspaceService()
copilot_service = CopilotClientService()
settings_service = InMemorySettingsService()
mcp_service = InMemoryMCPService()

class GlobalState:
    def __init__(self):
        self.current_model = "claude-sonnet-4"

global_state = GlobalState()

def get_session_repo():
    return session_repo

def get_plan_repo():
    return plan_repo

def get_workspace_service():
    return workspace_service

def get_copilot_service():
    return copilot_service

def get_settings_service():
    return settings_service

def get_mcp_service():
    return mcp_service

def get_global_state():
    return global_state
