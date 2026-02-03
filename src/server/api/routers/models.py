from fastapi import APIRouter, Depends, HTTPException
from domain.interfaces import CopilotService
from domain.models import ModelsResponse
from api.deps import get_copilot_service, get_global_state, GlobalState

router = APIRouter()

@router.get("/api/models", response_model=ModelsResponse)
async def get_models(
    service: CopilotService = Depends(get_copilot_service),
    state: GlobalState = Depends(get_global_state)
):
    models = await service.list_models()
    return ModelsResponse(models=models, current=state.current_model)

@router.post("/api/models")
async def set_model(
    data: dict,
    state: GlobalState = Depends(get_global_state)
):
    model = data.get("model")
    if model:
        state.current_model = model
        return {"model": state.current_model}
    raise HTTPException(status_code=400, detail="Invalid model")
