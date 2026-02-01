import asyncio
import sys
import random
from copilot import CopilotClient
from copilot.tools import define_tool
from pydantic import BaseModel, Field

# 1. Define input parameters using Pydantic
class GetWeatherParams(BaseModel):
    city: str = Field(description="The name of the city to get weather for")

# 2. Define the tool using the decorator
@define_tool(description="Get the current weather/forecast for a specific city")
async def get_weather(params: GetWeatherParams) -> dict:
    """Mock weather service that returns random weather."""
    conditions = ["Sunny", "Rainy", "Cloudy", "Windy", "Snowy"]
    temp = random.randint(-5, 35)
    condition = random.choice(conditions)
    
    print(f"\n[SYSTEM] Fetching weather for {params.city}...")
    await asyncio.sleep(1) # Simulate network delay
    
    return {
        "city": params.city,
        "temperature_c": temp,
        "temperature_f": (temp * 9/5) + 32,
        "condition": condition,
        "humidity": f"{random.randint(30, 90)}%"
    }

async def main():
    client = CopilotClient()
    
    try:
        print("Starting Copilot Client with Custom Tool...")
        await client.start()
        
        # 3. Register the tool in the session
        session = await client.create_session({
            "tools": [get_weather]
        })
        
        print("Session created. Ask me about the weather! (Type 'exit' to quit)")
        print("-" * 50)
        
        while True:
            try:
                user_input = input("\nYou: ")
            except EOFError:
                break
                
            if user_input.lower() in ['exit', 'quit']:
                break
                
            if not user_input.strip():
                continue
            
            print("Copilot is thinking...", end="\r")
            
            try:
                # The agent will decide to call the tool if the prompt requires it
                response = await session.send_and_wait({
                    "prompt": user_input
                })
                
                print(" " * 20, end="\r")
                print(f"Copilot: {response.data.content}")
                
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
