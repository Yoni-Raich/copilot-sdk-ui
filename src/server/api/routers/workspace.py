from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from domain.interfaces import WorkspaceService
from domain.models import (
    WorkspaceResponse, WorkspaceUpdate, WorkspaceCreate,
    FileEntry, InstructionsResponse, InstructionsUpdate, ReviewResponse
)
from api.deps import get_workspace_service

router = APIRouter()

@router.get("/api/workspace", response_model=WorkspaceResponse)
async def get_workspace(service: WorkspaceService = Depends(get_workspace_service)):
    return await service.get_info()

@router.post("/api/workspace", response_model=WorkspaceResponse)
async def set_workspace(data: WorkspaceUpdate, service: WorkspaceService = Depends(get_workspace_service)):
    try:
        return await service.set_current(data.workspace)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/workspaces/create", response_model=WorkspaceResponse)
async def create_workspace(data: WorkspaceCreate, service: WorkspaceService = Depends(get_workspace_service)):
    try:
        return await service.create(data.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/workspace/instructions", response_model=InstructionsResponse)
async def get_instructions(service: WorkspaceService = Depends(get_workspace_service)):
    return await service.get_instructions()

@router.post("/api/workspace/instructions", response_model=InstructionsResponse)
async def save_instructions(data: InstructionsUpdate, service: WorkspaceService = Depends(get_workspace_service)):
    return await service.save_instructions(data.content)

@router.get("/api/files", response_model=List[FileEntry])
async def get_files(path: Optional[str] = None, service: WorkspaceService = Depends(get_workspace_service)):
    try:
        return await service.list_files(path)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/api/file")
async def get_file(path: str, service: WorkspaceService = Depends(get_workspace_service)):
    try:
        content = await service.read_file(path)
        return {"content": content, "path": path}
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/file")
async def write_file(data: dict, service: WorkspaceService = Depends(get_workspace_service)):
    try:
        await service.write_file(data.get("path"), data.get("content"))
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/review", response_model=ReviewResponse)
async def code_review(data: dict, service: WorkspaceService = Depends(get_workspace_service)):
    return await service.run_review(data.get("workspace"))
