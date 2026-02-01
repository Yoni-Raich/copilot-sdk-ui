# Custom Agents

Custom agents allow you to define specialized AI personas with specific identities, descriptions, and instructions.

## Defining Agents

You can define agents when creating a session using `custom_agents` in the configuration.

```python
from copilot import CopilotClient

async def main():
    client = CopilotClient()
    await client.start()

    session = await client.create_session({
        "model": "gpt-4.1",
        "custom_agents": [
            {
                "name": "python_expert",
                "display_name": "Python Expert",
                "description": "An expert in Python programming and best practices.",
                "prompt": "You are a senior Python engineer. Always prioritize type safety, PEP 8 compliance, and modern async patterns."
            },
            {
                "name": "security_auditor",
                "display_name": "Security Auditor",
                "description": "Reviews code for security vulnerabilities.",
                "prompt": "You are a security auditor. Analyze code for OWASP Top 10 vulnerabilities and suggest secure alternatives."
            }
        ]
    })

    # You can now invoke these agents or the system might route to them.
    # Note: Explicit agent addressing depends on the Copilot implementation specifics.
    
    await session.send_and_wait({
        "prompt": "@python_expert How do I implement a thread-safe singleton?"
    })

    await client.stop()
```

## Agent Configuration via Files

You can also define agents in `.github/agents` directory of your repository. The SDK will pick these up if the CLI is running in the context of that repository.

Example `my-agent.md`:
```markdown
---
name: my-agent
description: A helpful assistant for my project
---

You are a helpful assistant.
```
