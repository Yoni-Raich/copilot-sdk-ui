---
name: github-copilot-sdk
description: Python SDK for GitHub Copilot CLI - Embed Copilot's agentic workflows in Python applications. Use when building applications that need AI-powered code assistance, creating custom tools for Copilot, managing multiple conversation sessions, implementing streaming responses, connecting to MCP servers, or integrating custom agents. Triggers on requests involving GitHub Copilot SDK, copilot-sdk Python, CopilotClient, or building AI-powered developer tools.
---

# GitHub Copilot SDK for Python

Embed Copilot's agentic workflows in your Python application. The SDK exposes the same engine behind Copilot CLI as a programmable interface.

## Installation

```bash
pip install github-copilot-sdk
```

**Prerequisites:**
- GitHub Copilot CLI installed and authenticated ([Installation guide](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli))
- Python 3.8+
- Active GitHub Copilot subscription

Verify CLI:
```bash
copilot --version
```

## Architecture

```
Your Application → SDK Client → JSON-RPC → Copilot CLI (server mode)
```

The SDK manages CLI process lifecycle automatically or connects to an external CLI server.

## Features

- **Chat Interfaces**: Build custom chat bots and assistants.
- **File System Access**: Agents can read, write, and edit files in the workspace (enabled by default).
- **Custom Agents**: Define specialized personas with unique system prompts.
- **Tools**: Create custom Python tools or use built-in Copilot capabilities.


## Quick Start

### Basic Message

```python
import asyncio
from copilot import CopilotClient

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({"model": "gpt-4.1"})
    response = await session.send_and_wait({"prompt": "What is 2 + 2?"})

    print(response.data.content)

    await client.stop()

asyncio.run(main())
```

### Streaming Responses

```python
import asyncio
import sys
from copilot import CopilotClient
from copilot.generated.session_events import SessionEventType

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
    })

    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            sys.stdout.write(event.data.delta_content)
            sys.stdout.flush()
        if event.type == SessionEventType.SESSION_IDLE:
            print()

    session.on(handle_event)
    await session.send_and_wait({"prompt": "Tell me a short joke"})
    await client.stop()

asyncio.run(main())
```

### Custom Tools

Define tools that Copilot can call:

```python
import asyncio
import random
import sys
from copilot import CopilotClient
from copilot.tools import define_tool
from copilot.generated.session_events import SessionEventType
from pydantic import BaseModel, Field

class GetWeatherParams(BaseModel):
    city: str = Field(description="The name of the city to get weather for")

@define_tool(description="Get the current weather for a city")
async def get_weather(params: GetWeatherParams) -> dict:
    conditions = ["sunny", "cloudy", "rainy", "partly cloudy"]
    temp = random.randint(50, 80)
    condition = random.choice(conditions)
    return {"city": params.city, "temperature": f"{temp}°F", "condition": condition}

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
        "tools": [get_weather],
    })

    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            sys.stdout.write(event.data.delta_content)
            sys.stdout.flush()

    session.on(handle_event)
    await session.send_and_wait({"prompt": "What's the weather like in Seattle?"})
    await client.stop()

asyncio.run(main())
```

## Advanced Features

For detailed documentation on advanced patterns, see the reference files:

- **File Operations**: See [references/files.md](references/files.md) for reading and writing files
- **Custom Agents**: See [references/agents.md](references/agents.md) for defining personas and agents
- **Configuration & BYOK**: See [references/configuration.md](references/configuration.md) for environment setup and model config
- **Error Handling**: See [references/error-handling.md](references/error-handling.md) for try-except patterns, timeouts, graceful shutdown
- **Multiple Sessions**: See [references/sessions.md](references/sessions.md) for managing parallel conversations
- **MCP Servers**: See [references/advanced.md](references/advanced.md) for MCP integration

## Examples & Scripts

Use the scripts in the `scripts/` directory to explore and test the SDK capabilities:

- **Basic Chat**: [scripts/basic_chat.py](scripts/basic_chat.py) - An interactive chat loop with the agent
- **Tool Chat**: [scripts/tool_chat.py](scripts/tool_chat.py) - Chat interface that displays tool calls and results
- **Custom Tool**: [scripts/custom_tool.py](scripts/custom_tool.py) - Demonstrates defining and using a custom weather tool

## Session Management Quick Reference

```python
# Custom session ID
session = await client.create_session({
    "session_id": "user-123-chat",
    "model": "gpt-4.1"
})

# List sessions
sessions = client.list_sessions()

# Resume session
session = client.resume_session("user-123-conversation")

# Delete session
client.delete_session("user-123-chat")

# Get message history
messages = session.get_messages()
```

## Context Manager Pattern

```python
from copilot import CopilotClient

with CopilotClient() as client:
    client.start()
    session = client.create_session(model="gpt-4.1")
    # ... do work ...
    # client.stop() is automatically called
```

## External CLI Server

Connect to a separately running CLI:

```bash
# Start CLI in server mode
copilot --server --port 4321
```

```python
from copilot import CopilotClient

client = CopilotClient({
    "cli_url": "localhost:4321"
})
await client.start()
session = await client.create_session()
```

## Key Resources

- [Official GitHub Repo](https://github.com/github/copilot-sdk)
- [Getting Started Guide](https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md)
- [Python Cookbook](https://github.com/github/copilot-sdk/blob/main/cookbook/python/README.md)
- [Awesome Copilot Instructions](https://github.com/github/awesome-copilot/blob/main/collections/copilot-sdk.md)
