# Project Instructions: Copilot SDK UI

## Project Overview
This project, `copilot-sdk-ui`, is a modern, responsive web interface for the GitHub Copilot CLI. It provides a ChatGPT-like experience for interacting with Copilot, running locally on the user's machine.

## Technical Architecture

### Stack
- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js with Express and `express-ws` (WebSocket support)
- **Styling**: Vanilla CSS with custom properties (CSS Variables)
- **Icons**: Lucide React
- **State/Logic**: React Hooks

### Development Environment
- **Runtime**: Node.js 18+
- **Package Manager**: npm
- **Build Tool**: Vite (Frontend), `tsx` (Backend dev)

## Project Structure
- `src/client/`: Frontend React application
  - `components/`: React components (ChatView, Sidebar, Modals)
  - `styles/`: Global CSS (`globals.css`)
  - `App.tsx`: Main entry component
- `src/server/`: Backend Express application
  - `index.ts`: Main server entry point (API + WebSockets)
- `src/shared/`: (If applicable) Shared types/utilities
- `.agent/`: Agent-specific configuration and documentation

## Key Features to Maintain
1.  **Chat Interface**: Real-time streaming, conversation history, multiple models.
2.  **Slash Commands**: `/new`, `/settings`, `/plan`, etc.
3.  **MCP Integration**: Management of Model Context Protocol servers.
4.  **Responsive Design**: Mobile-friendly layout.

## Development Workflow

### Starting the App
To start both the backend server and frontend client in development mode:
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Coding Standards
- **TypeScript**: Use strict typing. Avoid `any` where possible.
- **Components**: Functional components with Hooks.
- **Styling**: Use CSS variables for theming (light/dark mode).
- **File Naming**: PascalCase for components (`ChatView.tsx`), camelCase for logic/utils.

## Agent Guidelines
1.  **Context**: Always check `README.md` for latest features.
2.  **Modifications**: When modifying UI, ensure responsive design is preserved.
3.  **Backend**: Changes to `src/server/index.ts` usually require a server restart (handled by `tsx watch`).
4.  **Dependencies**: Check `package.json` before adding new libraries. prefer existing ones (e.g., `lucide-react` for icons).

## Common Tasks
- **Adding a new slash command**: Update `CommandPalette.tsx` and potentially backend handlers.
- **Supporting a new Model**: Update `api/models` endpoint or configuration.
- **Theming**: Update `src/client/styles/globals.css`.
