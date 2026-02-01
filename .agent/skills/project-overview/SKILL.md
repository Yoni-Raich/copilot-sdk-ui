---
name: project-overview
description: Explains the Copilot SDK UI project structure, architecture, and key components. Use this skill to understand where code is located and how the system fits together.
---

# Project Overview: Copilot SDK UI

> [!IMPORTANT]
> **Maintenance**: This file reflects the current project structure. **It must be updated immediately after any changes to the project structure, file organization, or architecture.**

This project is a modern web interface for the GitHub Copilot CLI, featuring a React frontend and a dual-backend (Node.js/Python) architecture during migration.

## Directory Structure

### `src/` - Source Code

#### `src/client/` - Frontend Application
Built with React, TypeScript, and Vite.
- **`components/`**: React components (ChatView, Sidebar, Modals).
- **`styles/`**: Global CSS and themes.
- **`App.tsx`**: Main entry component.
- **`types.ts`**: Frontend TypeScript definitions.

#### `src/server/` - Backend Application
Python FastAPI server using `github-copilot-sdk`.
- **`server.py`**: Main FastAPI server entry point.
- **`models.py`**: Pydantic data models.
- **`test_server.py`**: Minimal server for connectivity testing.

### `.agent/` - Agent Configuration
Contains resources for the AI agent working on this project.
- **`instructions.md`**: High-level project rules and context.
- **`skills/`**: Specialized capabilities for the agent.
    - `github-copilot-sdk/`: SDK documentation and scripts.
    - `project-overview/`: This skill.

### Root Files
- **`README.md`**: General project documentation.
- **`package.json`**: Node.js dependencies and scripts.
- **`requirements.txt`**: Python dependencies.

## Architecture

1.  **Frontend**: React app calls API endpoints (`/api/models`, `/api/sessions`) and connects via WebSocket (`/ws/chat/:id`) for real-time chat.
2.  **Backend**: Python FastAPI server using Copilot SDK.
3.  **Data Persistence**: Currently in-memory (sessions, settings) or file-system based (workspaces).

## Key Workflows

-   **Chat**: User sends message -> WebSocket -> `server.py` -> `CopilotClient` -> Copilot CLI -> Streaming response back to UI.
-   **Tools/MCP**: The Python server configures MCP servers via the SDK `create_session` parameters.
