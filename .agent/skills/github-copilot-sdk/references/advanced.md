# Advanced Features

## MCP (Model Context Protocol) Servers

Connect to MCP servers for pre-built tools. GitHub's MCP server provides access to repositories, issues, and pull requests:

```python
session = await client.create_session({
    "mcp_servers": {
        "github": {
            "type": "http",
            "url": "https://api.githubcopilot.com/mcp/",
        },
    },
})
```

## Custom Agents

Define specialized AI personas for specific tasks:

```python
session = await client.create_session({
    "custom_agents": [{
        "name": "pr-reviewer",
        "display_name": "PR Reviewer",
        "description": "Reviews pull requests for best practices",
        "prompt": "You are an expert code reviewer. Focus on security, performance, and maintainability.",
    }],
})
```

## Custom System Message

Control the AI's behavior and personality:

```python
session = await client.create_session({
    "system_message": {
        "content": "You are a helpful assistant for our engineering team. Always be concise.",
    },
})
```

## External CLI Server

Run the CLI separately from the SDK for debugging, resource sharing, or custom environments.

### Start CLI in Server Mode

```bash
copilot --server --port 4321
```

If you don't specify a port, the CLI will choose a random available port.

### Connect SDK to External Server

```python
from copilot import CopilotClient

client = CopilotClient({
    "cli_url": "localhost:4321"
})
await client.start()

# Use the client normally
session = await client.create_session()
# ...
```

**Note:** When `cli_url` is provided, the SDK will not spawn or manage a CLI process—it only connects to the existing server.

### External Server Use Cases

- **Debugging**: Keep the CLI running between SDK restarts to inspect logs
- **Resource sharing**: Multiple SDK clients can connect to the same CLI server
- **Development**: Run the CLI with custom settings or in a different environment

---

## Tool Behavior

By default, the SDK operates the Copilot CLI with `--allow-all`, enabling all first-party tools:
- File system operations
- Git operations
- Web requests

Customize tool availability via SDK client options. Refer to the Copilot CLI documentation for the full list of available tools.

## How Tools Work

When you define a tool:

1. **What the tool does** (description)
2. **What parameters it needs** (schema via Pydantic)
3. **What code to run** (async handler function)

Copilot decides when to call your tool based on the user's question:

1. Copilot sends a tool call request with parameters
2. The SDK runs your handler function
3. The result is sent back to Copilot
4. Copilot incorporates the result into its response

## Supported Models

All models available via Copilot CLI are supported. The SDK exposes a method to return available models at runtime.

## FAQ

| Question | Answer |
|----------|--------|
| Copilot subscription required? | Yes, refer to [GitHub Copilot pricing](https://github.com/features/copilot#pricing) |
| Billing? | Based on premium request quota, same as CLI |
| BYOK supported? | Yes, configure your own API keys (OpenAI, Azure, Anthropic) |
| Production-ready? | Technical Preview—functional for dev/testing |
| Report issues? | [GitHub Issues](https://github.com/github/copilot-sdk/issues) |
