import requests
import time
import sys

BASE_URL = "http://localhost:3001/api"
WS_NAME = "test_ws_instructions_beta"

def verify_instructions():
    print(f"Creating workspace '{WS_NAME}'...")
    try:
        # Create workspace
        res = requests.post(f"{BASE_URL}/workspaces/create", json={"name": WS_NAME})
        if res.status_code != 200:
            print(f"❌ Failed to create workspace: {res.text}")
            return
            
        print("✅ Workspace created.")
        
        # Check instructions
        print("Checking for default instructions...")
        res = requests.get(f"{BASE_URL}/workspace/instructions")
        if res.status_code == 200:
            data = res.json()
            content = data.get("content", "")
            if "# Copilot Instructions" in content and "Guidelines" in content:
                print("✅ Default instructions found:")
                print("---")
                print(content[:100] + "...")
                print("---")
            else:
                print("❌ Instructions file found but content mismatch.")
                print(f"Content: {content}")
        else:
            print(f"❌ Failed to get instructions: {res.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Wait for server startup
    time.sleep(2)
    verify_instructions()
