from typing import List, Optional, Dict
import uuid
from datetime import datetime
from domain.interfaces import SessionRepository, PlanRepository
from domain.models import Session, SessionCreate, SessionInfo, Plan, PlanCreate

class InMemorySessionRepository(SessionRepository):
    def __init__(self):
        self.sessions: Dict[str, Session] = {}

    async def get(self, session_id: str) -> Optional[Session]:
        return self.sessions.get(session_id)

    async def save(self, session: Session) -> Session:
        self.sessions[session.id] = session
        return session

    async def delete(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    async def list(self) -> List[SessionInfo]:
        return [
            SessionInfo(
                id=s.id,
                name=s.name,
                workspace=s.workspace,
                message_count=len(s.messages),
                created_at=s.created_at,
                model=s.model,
            )
            for s in self.sessions.values()
        ]

    async def create(self, data: SessionCreate) -> Session:
        session = Session(
            id=str(uuid.uuid4()),
            name=data.name or "New Chat",
            workspace=data.workspace or "",
            model=data.model or "claude-sonnet-4", # Default handled in service/usecase usually, but okay here
        )
        self.sessions[session.id] = session
        return session

class InMemoryPlanRepository(PlanRepository):
    def __init__(self):
        self.plans: Dict[str, List[Plan]] = {}

    async def get_active(self, session_id: str) -> Optional[Plan]:
        plans = self.plans.get(session_id, [])
        return next((p for p in plans if p.status in ["active", "draft"]), None)

    async def list(self, session_id: str) -> List[Plan]:
        return self.plans.get(session_id, [])

    async def create(self, session_id: str, data: PlanCreate) -> Plan:
        plan = Plan(
            title=data.title or "Untitled Plan",
            content=data.content,
        )
        if session_id not in self.plans:
            self.plans[session_id] = []
        
        # Mark previous plans as completed
        for p in self.plans[session_id]:
            if p.status != "completed":
                p.status = "completed"
        
        self.plans[session_id].insert(0, plan)
        return plan

    async def delete(self, session_id: str, plan_id: str) -> bool:
        if session_id in self.plans:
            self.plans[session_id] = [p for p in self.plans[session_id] if p.id != plan_id]
            return True
        return False
