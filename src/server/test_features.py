import requests
import json
import sys

BASE_URL = "http://localhost:3001/api"

def test_models():
    print("\nTesting Model Listing...")
    try:
        res = requests.get(f"{BASE_URL}/models")
        if res.status_code == 200:
            data = res.json()
            print(f"✅ Success. Found {len(data['models'])} models.")
            print(f"Current model: {data['current']}")
        else:
            print(f"❌ Failed: {res.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_workspace_management():
    print("\nTesting Workspace Management...")
    
    # 1. Get info
    print("1. Getting workspace info...")
    res = requests.get(f"{BASE_URL}/workspace")
    if res.status_code != 200:
        print(f"❌ Failed to get workspace: {res.status_code}")
        return
    data = res.json()
    print(f"✅ Current: {data['workspace']}")
    print(f"✅ Root: {data['root']}")
    
    # 2. Create workspace
    new_ws_name = "test_workspace_alpha"
    print(f"2. Creating workspace '{new_ws_name}'...")
    res = requests.post(f"{BASE_URL}/workspaces/create", json={"name": new_ws_name})
    if res.status_code == 200:
        print(f"✅ Created and switched to: {res.json()['workspace']}")
    else:
        print(f"❌ Failed to create: {res.text}")

    # 3. Instructions
    print("3. Testing Instructions...")
    instr_content = "You are a helpful AI assistant for testing."
    res = requests.post(f"{BASE_URL}/workspace/instructions", json={"content": instr_content})
    if res.status_code == 200:
        print(f"✅ Saved instructions to: {res.json()['path']}")
        
        # Verify read
        res = requests.get(f"{BASE_URL}/workspace/instructions")
        if res.json()['content'] == instr_content:
            print("✅ Verified read back instructions.")
        else:
            print("❌ Read back content mismatch.")
    else:
        print(f"❌ Failed to save instructions: {res.text}")

if __name__ == "__main__":
    test_models()
    test_workspace_management()
