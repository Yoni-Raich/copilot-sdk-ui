# Error Handling Patterns

## Basic Try-Except

```python
from copilot import CopilotClient

client = CopilotClient()

try:
    client.start()
    session = client.create_session(model="gpt-4.1")

    response = None
    def handle_message(event):
        nonlocal response
        if event["type"] == "assistant.message":
            response = event["data"]["content"]

    session.on(handle_message)
    session.send(prompt="Hello!")
    session.wait_for_idle()

    if response:
        print(response)

    session.destroy()
except Exception as e:
    print(f"Error: {e}")
finally:
    client.stop()
```

## Specific Error Types

```python
try:
    client.start()
except FileNotFoundError:
    print("Copilot CLI not found. Please install it first.")
except ConnectionError:
    print("Could not connect to Copilot CLI server.")
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Timeout Handling

```python
import signal
from contextlib import contextmanager

@contextmanager
def timeout(seconds):
    def timeout_handler(signum, frame):
        raise TimeoutError("Request timed out")

    old_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_handler)

session = client.create_session(model="gpt-4.1")

try:
    session.send(prompt="Complex question...")
    with timeout(30):
        session.wait_for_idle()
    print("Response received")
except TimeoutError:
    print("Request timed out")
```

## Aborting a Request

```python
import threading

session = client.create_session(model="gpt-4.1")
session.send(prompt="Write a very long story...")

def abort_later():
    import time
    time.sleep(5)
    session.abort()
    print("Request aborted")

threading.Thread(target=abort_later).start()
```

## Graceful Shutdown

```python
import signal
import sys

def signal_handler(sig, frame):
    print("\nShutting down...")
    errors = client.stop()
    if errors:
        print(f"Cleanup errors: {errors}")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
```

## Context Manager Cleanup

```python
from copilot import CopilotClient

with CopilotClient() as client:
    client.start()
    session = client.create_session(model="gpt-4.1")
    # ... do work ...
    # client.stop() is automatically called when exiting context
```

## Best Practices

1. **Always clean up**: Use try-finally or context managers
2. **Handle connection errors**: CLI might not be installed or running
3. **Set appropriate timeouts**: Long-running requests should have timeouts
4. **Log errors**: Capture error details for debugging
