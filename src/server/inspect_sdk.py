import asyncio
from copilot import CopilotClient
import inspect

def print_help():
    print("=== CopilotClient __init__ parameters ===")
    sig = inspect.signature(CopilotClient.__init__)
    print(sig)
    
    print("\n=== CopilotClient.create_session parameters ===")
    print(inspect.signature(CopilotClient.create_session))
    
    print("\n=== CopilotClient docstring ===")
    print(CopilotClient.__doc__)

    print("\n=== CopilotClient.create_session docstring ===")
    print(CopilotClient.create_session.__doc__)

if __name__ == "__main__":
    print_help()
