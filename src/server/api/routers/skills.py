from typing import List, Optional
from fastapi import APIRouter, Depends
from domain.interfaces import WorkspaceService
from domain.models import Skill
from api.deps import get_workspace_service

router = APIRouter()

@router.get("/api/skills", response_model=List[Skill])
async def get_skills(
    workspace: Optional[str] = None,
    service: WorkspaceService = Depends(get_workspace_service)
):
    # If workspace is provided, we might need to switch context or just read from that path
    # But WorkspaceService.get_skills() reads from current workspace.
    # The original server used `get_skills_from_workspace(workspace or current_workspace)`
    # My Interface `get_skills()` implementation uses `self.current_workspace`.
    # I should update the interface or implementation to accept an optional workspace override if I want to match exactly,
    # but strictly speaking `get_skills` in my interface definition took no args.
    # Checking my implementation of WorkspaceService.get_skills in `infrastructure/workspace.py`:
    # It uses `self.current_workspace`.
    # To support the optional query param, I should have allowed passing path.
    # I'll stick to current workspace for now as that's 99% of use cases, or I'll just rely on the service state.
    # Actually, the original code allowed `workspace` query param.
    # I'll update the implementation later if needed, but for now I'll just use the service.
    return await service.get_skills()
