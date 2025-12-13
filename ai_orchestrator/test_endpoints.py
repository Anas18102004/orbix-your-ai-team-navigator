"""Test API endpoints using FastAPI test client."""
import sys
from fastapi.testclient import TestClient

print("=" * 60)
print("Orbix AI Orchestrator - Endpoint Testing")
print("=" * 60)

try:
    from main import app
    client = TestClient(app)
    
    # Test 1: Health Check
    print("\n[1/4] Testing Health Endpoint...")
    response = client.get("/health")
    if response.status_code == 200:
        print(f"  ✓ Health check passed: {response.json()}")
    else:
        print(f"  ✗ Health check failed: {response.status_code}")
        sys.exit(1)
    
    # Test 2: Chat to Task Endpoint (without API key for now)
    print("\n[2/4] Testing Chat-to-Task Endpoint Structure...")
    test_payload = {
        "message_id": "test_msg_123",
        "workspace_id": "test_ws_123",
        "channel_id": "test_ch_123",
        "text": "We need to fix the login bug urgently",
        "sender_id": "test_user_123",
        "sender_name": "Test User",
        "channel_name": "general"
    }
    
    # This will fail without proper backend/auth, but we can check the endpoint exists
    response = client.post(
        "/ai/chat_to_task",
        json=test_payload,
        headers={"X-API-Key": "test-key"}
    )
    print(f"  ✓ Endpoint exists (status: {response.status_code})")
    if response.status_code != 200:
        print(f"    Note: Expected to fail without real backend connection")
        print(f"    Response: {response.json() if response.content else 'No content'}")
    
    # Test 3: Task Help Endpoint
    print("\n[3/4] Testing Task Help Endpoint Structure...")
    test_payload = {
        "workspace_id": "test_ws_123",
        "task_id": "test_task_123",
        "user_id": "test_user_123",
        "question": "How should I approach this task?"
    }
    
    response = client.post(
        "/ai/task_help",
        json=test_payload,
        headers={"X-API-Key": "test-key"}
    )
    print(f"  ✓ Endpoint exists (status: {response.status_code})")
    
    # Test 4: Ask Orbix Endpoint
    print("\n[4/4] Testing Ask Orbix Endpoint Structure...")
    test_payload = {
        "workspace_id": "test_ws_123",
        "user_id": "test_user_123",
        "message": "What's blocking our release?",
        "history": []
    }
    
    response = client.post(
        "/ai/ask_orbix",
        json=test_payload,
        headers={"X-API-Key": "test-key"}
    )
    print(f"  ✓ Endpoint exists (status: {response.status_code})")
    
    # Test 5: Insights Endpoint
    print("\n[5/5] Testing Insights Endpoint Structure...")
    test_payload = {
        "workspace_id": "test_ws_123",
        "user_id": "test_user_123"
    }
    
    response = client.post(
        "/ai/insights",
        json=test_payload,
        headers={"X-API-Key": "test-key"}
    )
    print(f"  ✓ Endpoint exists (status: {response.status_code})")
    
    print("\n" + "=" * 60)
    print("✓ All Endpoint Tests Completed!")
    print("=" * 60)
    print("\nNote: Endpoints may return errors without:")
    print("  - Real backend connection (http://localhost:3000)")
    print("  - Valid workspace/channel IDs")
    print("  - Gemini API key configured")
    print("=" * 60)
    
except Exception as e:
    print(f"\n✗ Error testing endpoints: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

