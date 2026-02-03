from fastapi import APIRouter, Depends
from domain.interfaces import SettingsService
from domain.models import AppSettings
from api.deps import get_settings_service

router = APIRouter()

@router.get("/api/settings", response_model=AppSettings)
async def get_settings(
    service: SettingsService = Depends(get_settings_service)
):
    return await service.get()

@router.post("/api/settings", response_model=AppSettings)
async def update_settings(
    data: dict,
    service: SettingsService = Depends(get_settings_service)
):
    return await service.update(data)
