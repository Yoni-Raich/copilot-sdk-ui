# Copilot SDK UI

A modern, responsive web interface for GitHub Copilot CLI. This project provides a ChatGPT-like UI experience for interacting with GitHub Copilot through its command-line interface.

![Copilot SDK UI](https://img.shields.io/badge/Copilot-SDK%20UI-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Chat Interface
- **Real-time streaming responses** - See responses as they're generated
- **Conversation history** - Context is maintained across messages
- **Multiple AI models** - Switch between Claude, GPT, and Gemini models
- **Thinking animation** - Visual feedback while waiting for responses

### Slash Commands
Type `/` in the chat input to access commands:
- `/new` - Start a new chat session
- `/resume` - Resume a previous session
- `/session` - View session info
- `/plan` - Enter plan mode for complex tasks
- `/review` - Code review interface
- `/compact` - Compact context to save tokens
- `/settings` - Open settings
- `/mcp` - Manage MCP servers

### Settings & Customization
- **Theme support** - Auto, Dark, and Light themes
- **Permission controls** - Configure tool permissions
- **MCP Server management** - Add and manage Model Context Protocol servers
- **Workspace selection** - Change working directory

### Mobile Responsive
- Fully responsive design for mobile devices
- Collapsible sidebar with touch-friendly navigation
- Optimized layouts for small screens

## Prerequisites

- **Node.js** 18+
- **GitHub Copilot CLI** installed and authenticated

### Install GitHub Copilot CLI

```bash
# Using npm
npm install -g @github/copilot

# Or using winget (Windows)
winget install GitHub.Copilot
```

### Authenticate with Copilot

```bash
copilot
# Then type /login and follow the prompts
```

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/copilot-sdk-ui.git
   cd copilot-sdk-ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both server and client in development mode |
| `scripts/dev.sh` | Shell wrapper for `npm run dev` |
| `npm run server` | Start only the backend server |
| `npm run client` | Start only the Vite client |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Project Structure

```
copilot-sdk-ui/
├── src/
│   ├── client/
│   │   ├── components/
│   │   │   ├── ChatView.tsx       # Main chat interface
│   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   ├── CommandPalette.tsx # Slash command autocomplete
│   │   │   ├── SessionModal.tsx   # Session info modal
│   │   │   ├── SettingsModal.tsx  # Settings configuration
│   │   │   ├── MCPModal.tsx       # MCP server management
│   │   │   ├── PlanModal.tsx      # Plan mode interface
│   │   │   ├── ReviewModal.tsx    # Code review interface
│   │   │   └── ...
│   │   ├── styles/
│   │   │   └── globals.css        # Global styles
│   │   ├── App.tsx                # Main app component
│   │   └── types.ts               # TypeScript interfaces
│   └── server/
│       ├── api/                   # FastAPI routers and dependencies
│       ├── domain/                # Business logic and models (Hexagonal)
│       ├── infrastructure/        # Implementations (Copilot SDK, FS)
│       └── server.py              # Application entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Python, FastAPI, WebSockets
- **Styling**: CSS with custom properties
- **Icons**: Lucide React
- **Markdown**: react-markdown

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List available models |
| POST | `/api/models` | Set current model |
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/:id` | Get session details |
| DELETE | `/api/sessions/:id` | Delete session |
| GET | `/api/skills` | List skills |
| GET | `/api/workspace` | Get current workspace |
| POST | `/api/workspace` | Set workspace |
| GET | `/api/settings` | Get app settings |
| POST | `/api/settings` | Update settings |
| GET | `/api/mcp/servers` | List MCP servers |
| WS | `/ws/chat/:sessionId` | WebSocket for chat |

## Configuration

### Environment Variables

The server uses sensible defaults, but you can configure:

- Default workspace: Current working directory
- Default model: `claude-sonnet-4`
- Server port: `3001`

### MCP Servers

Add MCP servers through the UI or create `~/.copilot/mcp-config.json`:

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allow"]
    }
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [GitHub Copilot](https://github.com/features/copilot) - The AI assistant powering this UI
- [Anthropic Claude](https://www.anthropic.com/) - AI models
- [OpenAI](https://openai.com/) - AI models
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI models
