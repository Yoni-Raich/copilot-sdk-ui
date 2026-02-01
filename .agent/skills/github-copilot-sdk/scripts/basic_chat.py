import asyncio
import sys
from copilot import CopilotClient

async def main():
    # Initialize the client
    client = CopilotClient()
    
    try:
        print("Starting Copilot Client...")
        await client.start()
        
        # Create a session
        # You can specify a model e.g., session = await client.create_session({"model": "gpt-4"})
        session = await client.create_session()
        print("Session created. Type 'exit' or 'quit' to end the conversation.")
        
        while True:
            # Get user input
            try:
                user_input = input("\nYou: ")
            except EOFError:
                break
            
            if user_input.lower() in ['exit', 'quit']:
                break
                
            if not user_input.strip():
                continue
            
            print("Copilot is thinking...", end="\r")
            
            # Send message and wait for response
            try:
                response = await session.send_and_wait({
                    "prompt": user_input
                })
                
                # Clear the "thinking" line
                print(" " * 20, end="\r")
                
                # Print the response content
                if response and response.data and response.data.content:
                    print(f"Copilot: {response.data.content}")
                else:
                    print("Copilot: (No content returned)")
                    
            except Exception as req_err:
                 print(f"\nRequest failed: {req_err}")

    except Exception as e:
        print(f"\nAn error occurred: {e}", file=sys.stderr)
    finally:
        print("\nStopping client...")
        await client.stop()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
