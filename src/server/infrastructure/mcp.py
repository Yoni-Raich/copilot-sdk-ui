import uuid
from typing import List, Dict, Any, Optional
from domain.interfaces import MCPService
from domain.models import MCPServer, MCPServerCreate

class InMemoryMCPService(MCPService):
    def __init__(self):
        self.servers: Dict[str, MCPServer] = {}

    async def list(self) -> List[MCPServer]:
        return list(self.servers.values())

    async def create(self, data: MCPServerCreate) -> MCPServer:
        server = MCPServer(
            id=str(uuid.uuid4()),
            name=data.name,
            command=data.command,
            args=data.args or [],
            env=data.env or {},
        )
        self.servers[server.id] = server
        return server

    async def update(self, server_id: str, data: Dict[str, Any]) -> Optional[MCPServer]:
        if server_id not in self.servers:
            return None
        server = self.servers[server_id]
        for key in ["enabled", "name", "command", "args", "env"]:
            if key in data:
                setattr(server, key, data[key])
        server.status = "running" if server.enabled else "stopped"
        return server

    async def delete(self, server_id: str) -> bool:
        if server_id in self.servers:
            del self.servers[server_id]
            return True
        return False
