# Session Management

## Multiple Sessions

Manage multiple independent conversations simultaneously:

```python
from copilot import CopilotClient

client = CopilotClient()
client.start()

# Create multiple independent sessions
session1 = client.create_session(model="gpt-4.1")
session2 = client.create_session(model="gpt-4.1")
session3 = client.create_session(model="claude-sonnet-4.5")

# Each session maintains its own conversation history
session1.send(prompt="You are helping with a Python project")
session2.send(prompt="You are helping with a TypeScript project")
session3.send(prompt="You are helping with a Go project")

# Follow-up messages stay in their respective contexts
session1.send(prompt="How do I create a virtual environment?")
session2.send(prompt="How do I set up tsconfig?")
session3.send(prompt="How do I initialize a module?")

# Clean up all sessions
session1.destroy()
session2.destroy()
session3.destroy()
client.stop()
```

## Custom Session IDs

Use custom IDs for easier tracking:

```python
session = client.create_session(
    session_id="user-123-chat",
    model="gpt-4.1"
)

print(session.session_id)  # "user-123-chat"
```

## Listing Sessions

```python
sessions = client.list_sessions()
for session_info in sessions:
    print(f"Session: {session_info['sessionId']}")
```

## Deleting Sessions

```python
client.delete_session("user-123-chat")
```

---

# Session Persistence

Save and restore conversation sessions across application restarts.

## Creating a Persistent Session

```python
from copilot import CopilotClient

client = CopilotClient()
client.start()

# Create session with a memorable ID
session = client.create_session(
    session_id="user-123-conversation",
    model="gpt-4.1",
)

session.send(prompt="Let's discuss TypeScript generics")

# Session ID is preserved
print(session.session_id)  # "user-123-conversation"

# Destroy session but keep data on disk
session.destroy()
client.stop()
```

## Resuming a Session

```python
client = CopilotClient()
client.start()

# Resume the previous session
session = client.resume_session("user-123-conversation")

# Previous context is restored
session.send(prompt="What were we discussing?")

session.destroy()
client.stop()
```

## Getting Session History

```python
messages = session.get_messages()
for msg in messages:
    print(f"[{msg['type']}] {msg['data']}")
```

## Deleting Permanently

```python
# Remove session and all its data from disk
client.delete_session("user-123-conversation")
```

## Use Cases

- **Multi-user applications**: One session per user
- **Multi-task workflows**: Separate sessions for different tasks
- **A/B testing**: Compare responses from different models

## Best Practices

1. **Use meaningful session IDs**: Include user ID or context
2. **Handle missing sessions**: Check if a session exists before resuming
3. **Clean up old sessions**: Periodically delete sessions no longer needed
