"""
Feature Explorer - Demonstrates advanced Copilot SDK features.

This script explores:
1. Model Selection - Creating sessions with different models
2. Workspace Configuration - Setting the working directory context
3. MCP Integration - Configuring Model Context Protocol servers
4. API Introspection - Discovering available methods
"""

import asyncio
import sys
import os
from copilot import CopilotClient
from copilot.generated.session_events import SessionEventType


async def print_available_methods(obj, name: str):
    """Print available public methods and attributes of an object."""
    print(f"\n{'='*60}")
    print(f"Available methods/attributes on {name}:")
    print('='*60)
    
    methods = [m for m in dir(obj) if not m.startswith('_')]
    for method in methods:
        attr = getattr(obj, method)
        if callable(attr):
            print(f"  📌 {method}()")
        else:
            print(f"  📎 {method} = {type(attr).__name__}")
    print()


async def demo_model_selection(client):
    """Demonstrate model selection capabilities."""
    print("\n" + "="*60)
    print("🎯 MODEL SELECTION DEMO")
    print("="*60)
    
    # Check if client has list_models method
    if hasattr(client, 'list_models'):
        print("\n📋 Attempting to list available models...")
        try:
            models = await client.list_models()
            print(f"Available models: {models}")
        except Exception as e:
            print(f"list_models() failed: {e}")
    else:
        print("\n⚠️  client.list_models() not available")
    
    # Create session with a specific model
    print("\n📝 Creating session with model 'gpt-4.1'...")
    session = await client.create_session({
        "model": "gpt-4.1",
        "streaming": True,
    })
    
    collected_response = []
    
    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            content = event.data.delta_content or ""
            sys.stdout.write(content)
            sys.stdout.flush()
            collected_response.append(content)
        elif event.type == SessionEventType.SESSION_IDLE:
            print("\n")
    
    session.on(handle_event)
    
    print("\n🤖 Asking: 'What model are you? Reply in one short sentence.'")
    print("-" * 40)
    print("Response: ", end="")
    
    await session.send_and_wait({
        "prompt": "What model are you? Reply in one short sentence."
    })
    
    return session


async def demo_workspace(client):
    """Demonstrate workspace/directory configuration."""
    print("\n" + "="*60)
    print("📁 WORKSPACE DEMO")
    print("="*60)
    
    # Get the current directory
    current_dir = os.getcwd()
    print(f"\n📍 Current working directory: {current_dir}")
    
    # Create session - the SDK should use the current directory as context
    session = await client.create_session({
        "streaming": True,
    })
    
    collected_response = []
    
    def handle_event(event):
        if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
            content = event.data.delta_content or ""
            sys.stdout.write(content)
            sys.stdout.flush()
            collected_response.append(content)
        elif event.type == SessionEventType.SESSION_IDLE:
            print("\n")
    
    session.on(handle_event)
    
    print("\n🔍 Asking agent to list files in current directory...")
    print("-" * 40)
    print("Response: ", end="")
    
    await session.send_and_wait({
        "prompt": "List the files and folders in the current directory. Just show me the names, no descriptions."
    })
    
    return session


async def demo_mcp_config(client):
    """Demonstrate MCP server configuration."""
    print("\n" + "="*60)
    print("🔌 MCP INTEGRATION DEMO")
    print("="*60)
    
    print("\n📋 Attempting to create session with MCP configuration...")
    
    try:
        # Try to create a session with MCP server configuration
        session = await client.create_session({
            "streaming": True,
            "mcp_servers": {
                "filesystem": {
                    "type": "stdio",
                    "command": "npx",
                    "args": ["-y", "@modelcontextprotocol/server-filesystem", os.getcwd()],
                },
            },
        })
        print("✅ Session created with MCP configuration (no error)")
        
        # Check what methods the session has related to MCP
        mcp_methods = [m for m in dir(session) if 'mcp' in m.lower() or 'server' in m.lower()]
        if mcp_methods:
            print(f"📌 MCP-related methods: {mcp_methods}")
        
        return session
        
    except Exception as e:
        print(f"❌ MCP configuration failed: {e}")
        print("   This might be expected if MCP servers are not supported directly via SDK.")
        return None


async def demo_session_management(client):
    """Demonstrate session management capabilities."""
    print("\n" + "="*60)
    print("📚 SESSION MANAGEMENT DEMO")
    print("="*60)
    
    # Check available session methods
    if hasattr(client, 'list_sessions'):
        print("\n📋 Listing existing sessions...")
        try:
            sessions = await client.list_sessions()
            print(f"Sessions: {sessions}")
        except Exception as e:
            print(f"list_sessions() failed: {e}")
    else:
        print("\n⚠️  client.list_sessions() not available")
    
    # Create a session with custom ID
    print("\n📝 Creating session with custom ID 'demo-session-123'...")
    try:
        session = await client.create_session({
            "session_id": "demo-session-123",
            "streaming": True,
        })
        print(f"✅ Session created: {session}")
        
        # Check if we can get session info
        if hasattr(session, 'get_messages'):
            print("   📌 session.get_messages() is available")
        if hasattr(session, 'id'):
            print(f"   📌 session.id = {session.id}")
            
    except Exception as e:
        print(f"❌ Custom session ID failed: {e}")


async def main():
    print("="*60)
    print("🚀 COPILOT SDK FEATURE EXPLORER")
    print("="*60)
    
    client = CopilotClient()
    
    try:
        print("\n⏳ Starting Copilot Client...")
        await client.start()
        print("✅ Client started successfully!")
        
        # Introspect client API
        await print_available_methods(client, "CopilotClient")
        
        # Demo 1: Model Selection
        session1 = await demo_model_selection(client)
        
        # Demo 2: Workspace
        session2 = await demo_workspace(client)
        
        # Demo 3: MCP
        session3 = await demo_mcp_config(client)
        
        # Demo 4: Session Management
        await demo_session_management(client)
        
        print("\n" + "="*60)
        print("✅ FEATURE EXPLORATION COMPLETE")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
    finally:
        print("\n⏳ Stopping client...")
        await client.stop()
        print("✅ Client stopped.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user.")
