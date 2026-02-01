from copilot import SessionConfig

print("Keys of SessionConfig:")
if hasattr(SessionConfig, "__annotations__"):
    print(sorted(SessionConfig.__annotations__.keys()))
else:
    print("Could not find annotations")
