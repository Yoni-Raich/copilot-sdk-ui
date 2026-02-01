# Configuration and Environments

## Bring Your Own Key (BYOK)

To use models from other providers (like Anthropic, Google, Azure, or OpenAI) with your own API keys:

1.  **Configure Keys Externally**: The SDK does not accept API keys directly in the code. You must configure them in your environment:
    *   **GitHub Organization Settings**: If you are using an Enterprise license, admins can configure model access.
    *   **IDE Integration**: If running locally alongside VS Code, configure keys in VS Code settings ("Chat: Manage Language Models").

2.  **Specify Model**: Once configured, refer to the model by name in `create_session`.

```python
session = await client.create_session({
    "model": "claude-3-5-sonnet", # Example model name if configured
})
```

## Environment Variables

The SDK and underlying CLI respect standard environment variables.

-   `GITHUB_TOKEN`: If not authenticated via `copilot auth`, you might need this (though CLI typically handles auth flow).
-   `COPILOT_CLI_PATH`: Path to the copilot executable if not in system PATH.

## Client Configuration

The `CopilotClient` accepts several configuration options:

```python
client = CopilotClient({
    "cli_path": "/usr/local/bin/copilot", # Custom CLI path
    "log_level": "DEBUG",                 # Enable verbose logging
    "cli_url": "localhost:4321",          # Connect to existing server
    "verbose": True                       # Print SDK debug info
})
```
