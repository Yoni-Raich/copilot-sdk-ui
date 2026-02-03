from typing import Dict, Any
from domain.interfaces import SettingsService
from domain.models import AppSettings

class InMemorySettingsService(SettingsService):
    def __init__(self):
        self.settings = AppSettings()

    async def get(self) -> AppSettings:
        return self.settings

    async def update(self, data: Dict[str, Any]) -> AppSettings:
        for key, value in data.items():
            if hasattr(self.settings, key):
                setattr(self.settings, key, value)
        return self.settings
