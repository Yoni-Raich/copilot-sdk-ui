from typing import List, Any, Optional, Dict
from copilot import CopilotClient
from domain.interfaces import CopilotService
from domain.models import ModelInfo

class CopilotClientService(CopilotService):
    def __init__(self):
        self.client = None
        self.active_sessions = {}
        self.session_clients: Dict[str, CopilotClient] = {}

    async def start(self):
        # Create a default client for listing models
        self.client = CopilotClient()
        await self.client.start()

    async def stop(self):
        # Stop all session-specific clients
        for client in self.session_clients.values():
            try:
                await client.stop()
            except Exception:
                pass
        self.session_clients.clear()
        
        if self.client:
            await self.client.stop()

    async def list_models(self) -> List[ModelInfo]:
        if not self.client:
            return []
            
        def resolve_provider(model_id: str, model_name: str) -> str:
            text = f"{model_id} {model_name}".lower()
            if "claude" in text:
                return "Anthropic"
            if "gpt" in text or "openai" in text:
                return "OpenAI"
            if "gemini" in text or "google" in text:
                return "Google"
            return "Unknown"

        try:
            sdk_models = await self.client.list_models()
            return [
                ModelInfo(
                    id=m.get("id", m),
                    name=m.get("name", m),
                    provider=m.get("provider") or resolve_provider(m.get("id", ""), m.get("name", "")),
                )
                for m in sdk_models
            ] if sdk_models else []
        except Exception:
            # Fallback
            return [
                ModelInfo(id="claude-sonnet-4", name="Claude Sonnet 4", provider="Anthropic"),
                ModelInfo(id="claude-sonnet-4.5", name="Claude Sonnet 4.5", provider="Anthropic"),
                ModelInfo(id="gpt-4.1", name="GPT-4.1", provider="OpenAI"),
                ModelInfo(id="gpt-5", name="GPT-5", provider="OpenAI"),
                ModelInfo(id="gemini-3-pro-preview", name="Gemini 3 Pro Preview", provider="Google"),
            ]

    async def create_session(self, model: str, workspace: str, session_id: Optional[str] = None, skill_directories: Optional[List[str]] = None) -> Any:
        if not self.client:
            raise RuntimeError("Copilot client not initialized")
        
        # Use workspace or fallback to current directory
        import os
        effective_cwd = workspace if workspace else os.getcwd()
        
        # Create a session-specific client with the correct working directory
        session_client = CopilotClient({"cwd": effective_cwd})
        await session_client.start()
        
        # Store client for later cleanup
        if session_id:
            self.session_clients[session_id] = session_client
        
        # Build session config
        session_config = {
            "model": model,
            "streaming": True,
        }
        
        # Add skill directories if provided
        if skill_directories:
            session_config["skill_directories"] = skill_directories
        
        session = await session_client.create_session(session_config)
        if session_id:
            self.active_sessions[session_id] = session
        return session
    
    def get_active_session(self, session_id: str) -> Any:
        return self.active_sessions.get(session_id)
        
    def remove_active_session(self, session_id: str):
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
        # Also cleanup the session client
        if session_id in self.session_clients:
            # Schedule async cleanup
            client = self.session_clients.pop(session_id)
            import asyncio
            asyncio.create_task(self._stop_client(client))
    
    async def _stop_client(self, client: CopilotClient):
        try:
            await client.stop()
        except Exception:
            pass
