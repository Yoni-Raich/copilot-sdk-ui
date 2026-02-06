"""
Copilot SDK UI - Python FastAPI Server (Refactored)
"""
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.deps import get_copilot_service
from api.routers import models, sessions, workspace, skills, settings, mcp, chat, uploads


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic for the FastAPI app."""
    # Force UTF-8 on Windows console
    if sys.platform == "win32":
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass
    
    print("DEBUG: Starting up server...")
    service = get_copilot_service()
    try:
        await service.start()
        print("DEBUG: CopilotClient started successfully.")
    except Exception as e:
        print(f"ERROR: Failed to start CopilotClient: {e}")
    
    print("""
============================================================
           Copilot SDK UI Server (Python)
============================================================
  Server running on http://localhost:3001
  Using GitHub Copilot SDK (Python)
============================================================
    """)
    
    yield  # App runs here
    
    # Shutdown
    await service.stop()


app = FastAPI(title="Copilot SDK UI Server", version="2.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(models.router)
app.include_router(sessions.router)
app.include_router(workspace.router)
app.include_router(skills.router)
app.include_router(settings.router)
app.include_router(mcp.router)
app.include_router(chat.router)
app.include_router(uploads.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
