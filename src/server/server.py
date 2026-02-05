"""
Copilot SDK UI - Python FastAPI Server (Refactored)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.deps import get_copilot_service
from api.routers import models, sessions, workspace, skills, settings, mcp, chat, uploads

app = FastAPI(title="Copilot SDK UI Server", version="2.0.0")

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

@app.on_event("startup")
async def startup_event():
    print("DEBUG: Starting up server...")
    service = get_copilot_service()
    try:
        await service.start()
        print("DEBUG: CopilotClient started successfully.")
    except Exception as e:
        print(f"ERROR: Failed to start CopilotClient: {e}")
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║            Copilot SDK UI Server (Python)                ║
╠══════════════════════════════════════════════════════════╣
║  Server running on http://localhost:3001                 ║
║  Using GitHub Copilot SDK (Python)                       ║
╚══════════════════════════════════════════════════════════╝
    """)

@app.on_event("shutdown")
async def shutdown_event():
    service = get_copilot_service()
    await service.stop()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
