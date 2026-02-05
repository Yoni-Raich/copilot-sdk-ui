from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from domain.interfaces import WorkspaceService
from domain.models import Skill
from api.deps import get_workspace_service

router = APIRouter()

class SkillCreateRequest(BaseModel):
    name: str
    workspace: Optional[str] = None

class SkillImportRequest(BaseModel):
    url: str
    workspace: Optional[str] = None

@router.get("/api/skills", response_model=List[Skill])
async def get_skills(
    workspace: Optional[str] = None,
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Get all skills from the current workspace."""
    return await service.get_skills()

@router.post("/api/skills/create", response_model=Skill)
async def create_skill(
    data: SkillCreateRequest,
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Create a new skill with a template SKILL.md file."""
    try:
        return await service.create_skill(data.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})

@router.post("/api/skills/import", response_model=Skill)
async def import_skill(
    data: SkillImportRequest,
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Import a skill from a URL (raw GitHub URL to SKILL.md)."""
    try:
        return await service.import_skill(data.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": str(e)})
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})

@router.delete("/api/skills/{name}")
async def delete_skill(
    name: str,
    workspace: Optional[str] = None,
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Delete a skill by name."""
    try:
        await service.delete_skill(name)
        return {"success": True, "message": f"Skill '{name}' deleted"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail={"error": str(e)})
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})

@router.get("/api/skills/directories")
async def get_skill_directories(
    service: WorkspaceService = Depends(get_workspace_service)
):
    """Get list of skill directories for SDK configuration."""
    dirs = await service.get_skill_directories()
    return {"directories": dirs}
