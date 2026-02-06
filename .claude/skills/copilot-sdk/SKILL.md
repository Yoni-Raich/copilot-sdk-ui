---
name: copilot-sdk
description: Guide for building applications with the GitHub Copilot SDK. Use when users want to embed Copilot's agentic workflows into applications using Python, TypeScript/Node.js, Go, or .NET. Covers streaming responses, custom tools, MCP server integration, custom agents, and session persistence.
---

# GitHub Copilot SDK

The GitHub Copilot SDK enables embedding Copilot's agentic workflows into applications programmatically without custom orchestration.

## Requirements

- GitHub Copilot CLI (authenticated via `gh auth login`)
- Runtime: Node.js 18+, Python 3.8+, Go 1.21+, or .NET 8.0+

## Installation

```bash
# Node.js
npm install @github/copilot-sdk tsx

# Python
pip install github-copilot-sdk

# Go
go get github.com/github/copilot-sdk/go

# .NET
dotnet add package GitHub.Copilot.SDK
```

## Quick Start

### Node.js/TypeScript

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
await client.start();

const session = await client.createSession({
  model: "gpt-4o",
  stream: true,
});

session.on("assistant", (msg) => console.log(msg.content));
await session.send("Explain async/await in JavaScript");

await client.stop();
```

### Python

```python
from github_copilot_sdk import CopilotClient

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session(model="gpt-4o", stream=True)

    @session.on("assistant")
    def on_assistant(msg):
        print(msg.content)

    await session.send("Explain async/await in Python")
    await client.stop()
```

## Custom Tools

Define tools that Copilot can invoke based on context:

```typescript
const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name" },
      },
      required: ["location"],
    },
    handler: async ({ location }) => {
      return { temperature: 72, condition: "sunny", location };
    },
  },
];

const session = await client.createSession({ tools });
```

## MCP Server Integration

Connect to Model Context Protocol servers for pre-built tools:

```typescript
const session = await client.createSession({
  mcpServers: [
    {
      name: "github",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
    },
  ],
});
```

## Custom Agents

Define specialized AI personas:

```typescript
const session = await client.createSession({
  agents: [
    {
      name: "code-reviewer",
      description: "Reviews code for best practices",
      systemPrompt: "You are an expert code reviewer...",
    },
  ],
});
```

## Session Persistence

Save conversations for multi-turn capabilities:

```typescript
const session = await client.createSession({
  sessionId: "user-123-conversation-1",
});
```

## Event Types

| Event | Description |
|-------|-------------|
| `user` | User message sent |
| `assistant` | Assistant response chunk |
| `reasoning` | Model reasoning output |
| `tool_call` | Tool invocation started |
| `tool_result` | Tool execution completed |
| `session_start` | Session initialized |
| `session_end` | Session terminated |
| `error` | Error occurred |

## Client Configuration

```typescript
const client = new CopilotClient({
  cliPath: "/custom/path/to/gh",  // Custom CLI path
  port: 8080,                      // Custom port
  autoStart: true,                 // Auto-start CLI
  autoRestart: true,               // Restart on crash
  workingDirectory: "/project",    // Working directory
  logging: true,                   // Enable logging
});
```

## Architecture

The SDK manages CLI lifecycle automatically via JSON-RPC over stdio or TCP. For debugging or resource sharing, use external server mode:

```typescript
const client = new CopilotClient({
  url: "http://localhost:8080",  // Connect to external server
});
```

## Status

Technical Preview - expect potential breaking changes. Not recommended for production use.
