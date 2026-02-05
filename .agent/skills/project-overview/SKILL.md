---
name: project-overview
description: Explains the Copilot SDK UI project structure, architecture, and key components. Use this skill to understand where code is located and how the system fits together.
---

# Project Overview: Copilot SDK UI

> [!IMPORTANT]
> **Maintenance**: This file reflects the current project structure. **It must be updated immediately after any changes to the project structure, file organization, or architecture.**

This project is a modern web interface for the GitHub Copilot CLI, featuring a React frontend and a Python FastAPI backend.

## Directory Structure

### `src/` - Source Code

#### `src/client/` - Frontend Application
Built with React, TypeScript, and Vite.
- **`components/`**: React components (ChatView, Sidebar, Modals, SkillsModal).
- **`styles/`**: Global CSS and themes.
- **`App.tsx`**: Main entry component.
- **`types.ts`**: Frontend TypeScript definitions.

#### `src/server/` - Backend Application
Python FastAPI server using `github-copilot-sdk` with Hexagonal Architecture.
- **`server.py`**: Main FastAPI server entry point.
- **`domain/`**: Core business logic and interfaces.
  - `interfaces.py`: Abstract interfaces (SessionRepository, WorkspaceService, CopilotService, etc.)
  - `models.py`: Pydantic data models (Session, Skill, ModelInfo, etc.)
- **`infrastructure/`**: Adapters implementing interfaces.
  - `copilot.py`: CopilotClientService - manages SDK clients per session with correct `cwd`.
  - `workspace.py`: FileSystemWorkspaceService - file operations, skills management.
  - `repositories.py`: In-memory session storage.
- **`api/`**: FastAPI routers and dependency injection.
  - `routers/`: API endpoint handlers (chat, models, sessions, skills, workspace, mcp).
  - `deps.py`: Dependency injection (singletons for services).

### `.agent/` and `.claude/` - Skills Directories
Skills are loaded from both directories by the SDK.
- **`.claude/skills/`**: User-installed skills (playwright, find-skills).
- **`.agent/skills/`**: Project-specific skills (github-copilot-sdk, project-overview).

### Root Files
- **`README.md`**: General project documentation.
- **`package.json`**: Node.js dependencies and scripts.
- **`vite.config.ts`**: Vite config with proxy to backend.

## Architecture

1.  **Frontend**: React app calls API endpoints (`/api/*`) and connects via WebSocket (`/ws/chat/:id`) for real-time chat.
2.  **Backend**: Python FastAPI server using Copilot SDK.
3.  **SDK Integration**: Each chat session creates its own `CopilotClient` with:
    - `cwd`: Set to the current workspace directory
    - `skill_directories`: Loaded from `.claude/skills` and `.agent/skills`
4.  **Data Persistence**: In-memory (sessions, settings) or file-system based (workspaces, skills).

## Key Workflows

-   **Chat**: User sends message -> WebSocket -> `chat.py` -> `CopilotClientService.create_session()` -> SDK session with correct `cwd` and `skill_directories` -> Streaming response back to UI.
-   **Skills Management**: 
    - `GET /api/skills`: List skills from both skill directories
    - `POST /api/skills/create`: Create new skill with template SKILL.md
    - `POST /api/skills/import`: Import skill from raw GitHub URL
    - `DELETE /api/skills/{name}`: Delete a skill
-   **Workspace**: Server-controlled via `COPILOT_WORKSPACES_ROOT` env var or `~/Documents/CopilotWorkspaces`.

## SDK Configuration

The Copilot SDK is configured per-session in `infrastructure/copilot.py`:

```python
# Client options (working directory)
session_client = CopilotClient({"cwd": workspace})

# Session config (model, streaming, skills)
session = await session_client.create_session({
    "model": model,
    "streaming": True,
    "skill_directories": [".claude/skills", ".agent/skills"],
})
```

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/models` | GET | List available models |
| `/api/sessions` | GET/POST | List/create sessions |
| `/api/workspace` | GET/POST | Get/set current workspace |
| `/api/skills` | GET | List installed skills |
| `/api/skills/create` | POST | Create new skill |
| `/api/skills/import` | POST | Import skill from URL |
| `/api/skills/{name}` | DELETE | Delete a skill |
| `/api/skills/directories` | GET | Get skill directory paths |
| `/ws/chat/{session_id}` | WS | Real-time chat WebSocket |
