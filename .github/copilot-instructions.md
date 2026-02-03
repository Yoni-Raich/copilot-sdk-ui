# Copilot Instructions

## Build, test, lint
- Dev (client + server): `npm run dev` (Vite on :5173, FastAPI on :3001)
- Client only: `npm run client`
- Server only: `npm run server`
- Build client: `npm run build`
- Preview build: `npm run preview`
- Python API smoke tests: `python src/server/test_features.py` (or `python src/server/test_server.py` for minimal FastAPI check)

## High-level architecture
- React + Vite frontend in `src/client/` talks to a FastAPI backend.
- Backend follows Hexagonal Architecture:
  - `src/server/domain/`: Core business logic and interfaces.
  - `src/server/infrastructure/`: Adapters for Copilot SDK, FileSystem, etc.
  - `src/server/api/`: FastAPI routers and dependency injection.
- Vite dev server proxies `/api` HTTP and `/ws` WebSocket to `http://localhost:3001` (see `vite.config.ts`).
- Chat uses WebSocket `/ws/chat/:sessionId`; REST APIs manage models, sessions, workspace, settings, MCP servers, and review summaries.
- Instructions are stored per-workspace in `.github/copilot-instructions.md` and edited via the Instructions modal.
- “Skills” are read from `<workspace>/.claude/skills/*/SKILL.md` frontmatter in the backend.

## Key conventions
- Frontend data is fetched from `/api/*` and realtime chat streams over WebSocket; keep both sides in sync when adding features.
- Session names are derived from the first user message; model changes are sent both via REST (`/api/models`) and WebSocket `set_model` events.
- Workspace selection is server-controlled; relative paths are resolved under `COPILOT_WORKSPACES_ROOT`.
- UI components are PascalCase in `src/client/components/`, with global styling in `src/client/styles/globals.css`.
