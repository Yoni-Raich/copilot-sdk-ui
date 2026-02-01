import inspect
from copilot import SessionConfig

print("Fields of SessionConfig:")
# If it's a TypedDict or Pydantic model
if hasattr(SessionConfig, "__annotations__"):
    print(SessionConfig.__annotations__)
elif hasattr(SessionConfig, "_fields"):
    print(SessionConfig._fields)
else:
    print(dir(SessionConfig))
