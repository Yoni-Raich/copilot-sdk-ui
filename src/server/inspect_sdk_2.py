import inspect
from copilot import CopilotClient
# Try to import the types if possible, or just print dir(CopilotClient)
import copilot

print("Attributes of copilot module:")
print(dir(copilot))

print("\nMethod signature of create_session:")
print(inspect.signature(CopilotClient.create_session))
