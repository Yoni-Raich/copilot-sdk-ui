#!/usr/bin/env python3
"""
Inspect the list_models() method to understand its exact return format.
"""

import asyncio
from copilot import CopilotClient

async def inspect_models():
    client = CopilotClient()
    
    try:
        print("Starting CopilotClient...")
        await client.start()
        print("Client started successfully.")
        
        print("\nCalling list_models()...")
        models = await client.list_models()
        
        print(f"\nlist_models() returned: {type(models)}")
        print(f"Number of models: {len(models) if models else 0}")
        
        if models:
            print("\nModels structure:")
            for i, model in enumerate(models):
                print(f"  [{i}] Type: {type(model)}")
                print(f"      Value: {model}")
                if hasattr(model, '__dict__'):
                    print(f"      Attributes: {model.__dict__}")
                if isinstance(model, dict):
                    print(f"      Keys: {list(model.keys())}")
                    for key, value in model.items():
                        print(f"        {key}: {value} (type: {type(value)})")
                print()
        else:
            print("No models returned or models is None/empty")
            
    except Exception as e:
        print(f"Error occurred: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        print("Stopping client...")
        await client.stop()
        print("Client stopped.")

if __name__ == "__main__":
    asyncio.run(inspect_models())