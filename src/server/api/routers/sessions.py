from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from domain.interfaces import SessionRepository, PlanRepository
from domain.models import (
    Session, SessionCreate, SessionInfo, Plan, PlanCreate
)
from api.deps import get_session_repo, get_plan_repo

router = APIRouter()

# Sessions
@router.get("/api/sessions", response_model=List[SessionInfo])
async def get_sessions(repo: SessionRepository = Depends(get_session_repo)):
    return await repo.list()

@router.post("/api/sessions", response_model=Session)
async def create_session(data: SessionCreate, repo: SessionRepository = Depends(get_session_repo)):
    return await repo.create(data)

@router.get("/api/sessions/{session_id}", response_model=Session)
async def get_session(session_id: str, repo: SessionRepository = Depends(get_session_repo)):
    session = await repo.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@router.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, repo: SessionRepository = Depends(get_session_repo)):
    await repo.delete(session_id)
    return {"success": True}

@router.get("/api/session/{session_id}/info")
async def get_session_info(session_id: str, repo: SessionRepository = Depends(get_session_repo)):
    s = await repo.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": s.id,
        "name": s.name,
        "copilotSessionId": s.copilot_session_id,
        "createdAt": s.created_at.isoformat(),
        "workspace": s.workspace,
        "model": s.model,
        "messageCount": len(s.messages),
    }

@router.patch("/api/session/{session_id}")
async def update_session(session_id: str, data: dict, repo: SessionRepository = Depends(get_session_repo)):
    s = await repo.get(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    if "name" in data:
        s.name = data["name"]
        await repo.save(s)
    return s

# Plans
@router.get("/api/session/{session_id}/plan")
async def get_active_plan(session_id: str, repo: PlanRepository = Depends(get_plan_repo)):
    active = await repo.get_active(session_id)
    if active:
        return active
    raise HTTPException(status_code=404, detail="No active plan")

@router.post("/api/session/{session_id}/plan", response_model=Plan)
async def create_plan(session_id: str, data: PlanCreate, repo: PlanRepository = Depends(get_plan_repo)):
    return await repo.create(session_id, data)

@router.get("/api/session/{session_id}/plans", response_model=List[Plan])
async def get_plans(session_id: str, repo: PlanRepository = Depends(get_plan_repo)):
    return await repo.list(session_id)

@router.delete("/api/session/{session_id}/plans/{plan_id}")
async def delete_plan(session_id: str, plan_id: str, repo: PlanRepository = Depends(get_plan_repo)):
    await repo.delete(session_id, plan_id)
    return {"success": True}

# Context
@router.get("/api/context")
async def get_context(sessionId: Optional[str] = None, repo: SessionRepository = Depends(get_session_repo)):
    message_tokens = 0
    if sessionId:
        s = await repo.get(sessionId)
        if s:
            for msg in s.messages:
                message_tokens += len(msg.content) // 4
    
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
