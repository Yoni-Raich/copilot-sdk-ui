import asyncio
import sys
import json
from copilot import CopilotClient
from copilot.generated.session_events import SessionEventType


def format_json(data):
    """Format data as indented JSON for display."""
    try:
        if isinstance(data, str):
            return data
        return json.dumps(data, indent=2, ensure_ascii=False)
    except:
        return str(data)


# Track tool calls by their ID
active_tool_calls = {}


async def main():
    client = CopilotClient()
    
    try:
        print("Starting Copilot Client...")
        await client.start()
        
        session = await client.create_session({
            "streaming": True
        })
        print("Session created. Type 'exit' or 'quit' to end.")
        print("-" * 50)
        
        def handle_event(event):
            """Handle session events and display tool calls."""
            
            if event.type == SessionEventType.TOOL_EXECUTION_START:
                tool_name = event.data.tool_name or "unknown"
                tool_call_id = event.data.tool_call_id
                args = event.data.arguments
                
                # Store tool name for later use
                if tool_call_id:
                    active_tool_calls[tool_call_id] = tool_name
                
                print(f"\n{'='*50}")
                print(f"[TOOL CALL] {tool_name}")
                print(f"{'='*50}")
                print(f"Arguments:")
                print(format_json(args))
                print("-" * 50)
                
            elif event.type == SessionEventType.TOOL_EXECUTION_COMPLETE:
                tool_call_id = event.data.tool_call_id
                # Get tool name from stored data or from event
                tool_name = active_tool_calls.pop(tool_call_id, None) if tool_call_id else None
                tool_name = tool_name or event.data.tool_name or "unknown"
                
                result = event.data.result
                print(f"\n[TOOL RESULT] {tool_name}")
                print("-" * 50)
                if result and result.content:
                    content = result.content
                    print(f"Content: {content[:500]}..." if len(content) > 500 else f"Content: {content}")
                else:
                    print("(No result)")
                print("-" * 50)
                
            elif event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
                sys.stdout.write(event.data.delta_content or "")
                sys.stdout.flush()
                
            elif event.type == SessionEventType.SESSION_IDLE:
                print("\n")


        
        session.on(handle_event)
        
        while True:
            try:
                user_input = input("\nYou: ")
            except EOFError:
                break
            
            if user_input.lower() in ['exit', 'quit']:
                break
                
            if not user_input.strip():
                continue
            
            print("\nCopilot: ", end="")
            
            try:
                await session.send_and_wait({
                    "prompt": user_input
                })
            except Exception as e:
                print(f"\nError: {e}")

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

