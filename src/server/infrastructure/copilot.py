"""
Copilot SDK integration service.

Uses a SINGLE CopilotClient instance with session persistence via
create_session() / resume_session(). MCP servers and instructions
are passed into session config.
"""

from typing import List, Any, Optional, Dict
from copilot import CopilotClient
from domain.interfaces import CopilotService
from domain.models import ModelInfo


class CopilotClientService(CopilotService):
    def __init__(self):
        self.client: Optional[CopilotClient] = None
        self.active_sessions: Dict[str, Any] = {}

    async def start(self):
        self.client = CopilotClient()
        await self.client.start()

    async def stop(self):
        # Destroy all active sessions
        for session_id, session in list(self.active_sessions.items()):
            try:
                await session.destroy()
            except Exception:
                pass
        self.active_sessions.clear()

        if self.client:
            await self.client.stop()

    async def list_models(self) -> List[ModelInfo]:
        if not self.client:
            return []

        def resolve_provider(model_id: str, model_name: str) -> str:
            text = f"{model_id} {model_name}".lower()
            if "claude" in text:
                return "Anthropic"
            if "gpt" in text or "openai" in text or "o1" in text or "o3" in text or "o4" in text:
                return "OpenAI"
            if "gemini" in text or "google" in text:
                return "Google"
            return "Unknown"

        try:
            sdk_models = await self.client.list_models()
            return [
                ModelInfo(
                    id=m.id,
                    name=m.name,
                    provider=resolve_provider(m.id, m.name),
                )
                for m in sdk_models
            ] if sdk_models else []
        except Exception as e:
            print(f"WARNING: Failed to list models from SDK: {e}")
            return [
                ModelInfo(id="claude-sonnet-4", name="Claude Sonnet 4", provider="Anthropic"),
                ModelInfo(id="gpt-4.1", name="GPT-4.1", provider="OpenAI"),
            ]

    async def create_session(
        self,
        model: str,
        workspace: str,
        session_id: Optional[str] = None,
        skill_directories: Optional[List[str]] = None,
        mcp_servers: Optional[Dict[str, Any]] = None,
        system_message: Optional[str] = None,
    ) -> Any:
        if not self.client:
            raise RuntimeError("Copilot client not initialized")

        session_config: Dict[str, Any] = {
            "model": model,
            "streaming": True,
        }

        if session_id:
            session_config["session_id"] = session_id

        # Add MCP servers if provided
        if mcp_servers:
            session_config["mcp_servers"] = mcp_servers

        # Add system message (instructions) if provided
        if system_message:
            session_config["system_message"] = {"content": system_message}

        session = await self.client.create_session(session_config)

        # Always store the session using the requested session_id
        actual_id = session_id or session.session_id
        self.active_sessions[actual_id] = session

        return session

    async def resume_session(self, session_id: str) -> Any:
        """Resume an existing SDK session for multi-turn conversation."""
        if not self.client:
            raise RuntimeError("Copilot client not initialized")

        session = await self.client.resume_session(session_id, {
            "streaming": True,
        })
        self.active_sessions[session_id] = session
        return session

    def get_active_session(self, session_id: str) -> Any:
        return self.active_sessions.get(session_id)

    def remove_active_session(self, session_id: str):
        session = self.active_sessions.pop(session_id, None)
        if session:
            try:
                import asyncio
                asyncio.create_task(self._destroy_session(session))
            except Exception:
                pass

    async def _destroy_session(self, session: Any):
        try:
            await session.destroy()
        except Exception:
            pass
