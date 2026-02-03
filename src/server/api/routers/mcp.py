from typing import List
from fastapi import APIRouter, Depends, HTTPException
from domain.interfaces import MCPService
from domain.models import MCPServer, MCPServerCreate
from api.deps import get_mcp_service

router = APIRouter()

@router.get("/api/mcp/servers", response_model=List[MCPServer])
async def get_mcp_servers(
    service: MCPService = Depends(get_mcp_service)
):
    return await service.list()

@router.post("/api/mcp/servers", response_model=MCPServer)
async def create_mcp_server(
    data: MCPServerCreate,
    service: MCPService = Depends(get_mcp_service)
):
    return await service.create(data)

@router.patch("/api/mcp/servers/{server_id}", response_model=MCPServer)
async def update_mcp_server(
    server_id: str,
    data: dict,
    service: MCPService = Depends(get_mcp_service)
):
    server = await service.update(server_id, data)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server

@router.delete("/api/mcp/servers/{server_id}")
async def delete_mcp_server(
    server_id: str,
    service: MCPService = Depends(get_mcp_service)
):
    await service.delete(server_id)
    return {"success": True}
