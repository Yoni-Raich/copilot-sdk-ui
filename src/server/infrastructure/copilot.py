from typing import List, Any, Optional
from copilot import CopilotClient
from domain.interfaces import CopilotService
from domain.models import ModelInfo

class CopilotClientService(CopilotService):
    def __init__(self):
        self.client = None
        self.active_sessions = {}

    async def start(self):
        self.client = CopilotClient()
        await self.client.start()

    async def stop(self):
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

    async def create_session(self, model: str, workspace: str, session_id: Optional[str] = None) -> Any:
        if not self.client:
            raise RuntimeError("Copilot client not initialized")
        
        session = await self.client.create_session({
            "model": model,
            "streaming": True,
            "working_directory": workspace,
        })
        if session_id:
            self.active_sessions[session_id] = session
        return session
    
    def get_active_session(self, session_id: str) -> Any:
        return self.active_sessions.get(session_id)
        
    def remove_active_session(self, session_id: str):
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]
