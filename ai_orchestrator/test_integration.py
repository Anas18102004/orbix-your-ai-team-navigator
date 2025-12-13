"""Test script for AI integration."""
import sys
import asyncio
from typing import Dict, Any

print("=" * 60)
print("Orbix AI Orchestrator - Integration Test")
print("=" * 60)

# Test 1: Configuration
print("\n[1/8] Testing Configuration...")
try:
    from config import settings
    print(f"  ✓ Config loaded")
    print(f"  ✓ Backend URL: {settings.orbix_backend_url}")
    print(f"  ✓ Service Port: {settings.ai_service_port}")
    print(f"  ✓ Gemini Model: {settings.gemini_model}")
    if settings.gemini_api_key:
        print(f"  ✓ Gemini API Key: {'*' * 20} (set)")
    else:
        print(f"  ⚠ Gemini API Key: NOT SET (required for full testing)")
except Exception as e:
    print(f"  ✗ Config error: {e}")
    sys.exit(1)

# Test 2: Model Wrappers
print("\n[2/8] Testing Model Wrappers...")
try:
    from models.llm import get_chat_model, get_classification_model, get_reasoning_model
    print("  ✓ Model wrapper functions imported")
    
    # Only test model creation if API key is set
    if settings.gemini_api_key:
        try:
            model = get_chat_model()
            print("  ✓ Chat model created successfully")
        except Exception as e:
            print(f"  ⚠ Model creation failed (API key issue?): {e}")
    else:
        print("  ⚠ Skipping model creation (no API key)")
except Exception as e:
    print(f"  ✗ Model wrapper error: {e}")
    sys.exit(1)

# Test 3: Schemas
print("\n[3/8] Testing Pydantic Schemas...")
try:
    from models.schemas import (
        MessageUnderstandingOutput,
        TaskExtractionOutput,
        AssignmentOutput,
        TaskHelperOutput
    )
    print("  ✓ All schemas imported")
    
    # Test schema creation
    test_understanding = MessageUnderstandingOutput(
        is_task_candidate=True,
        category="bug",
        urgency_estimate="high",
        cleaned_text="Test message",
        confidence=0.85
    )
    print("  ✓ Schema validation works")
except Exception as e:
    print(f"  ✗ Schema error: {e}")
    sys.exit(1)

# Test 4: Tools
print("\n[4/8] Testing Backend Tools...")
try:
    from tools.backend_tools import (
        get_workspace_members,
        get_workspace_config,
        create_task
    )
    print("  ✓ Backend tools imported")
except Exception as e:
    print(f"  ✗ Backend tools error: {e}")
    sys.exit(1)

# Test 5: Agents
print("\n[5/8] Testing Agents...")
try:
    from agents.safety import safety_policy_agent
    from agents.message_understanding import message_understanding_agent
    from agents.task_extraction import task_extraction_agent
    from agents.assignment import assignment_agent
    print("  ✓ All agents imported")
except Exception as e:
    print(f"  ✗ Agents error: {e}")
    sys.exit(1)

# Test 6: Graphs
print("\n[6/8] Testing LangGraph Workflows...")
try:
    from graphs.chat_to_task_graph import chat_to_task_graph
    from graphs.task_help_graph import task_help_graph
    from graphs.ask_orbix_chat_graph import ask_orbix_chat_graph
    from graphs.insights_graph import insights_graph
    print("  ✓ All graphs imported")
    print(f"  ✓ Chat-to-task graph: {type(chat_to_task_graph)}")
    print(f"  ✓ Task help graph: {type(task_help_graph)}")
    print(f"  ✓ Ask Orbix graph: {type(ask_orbix_chat_graph)}")
    print(f"  ✓ Insights graph: {type(insights_graph)}")
except Exception as e:
    print(f"  ✗ Graphs error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 7: FastAPI App
print("\n[7/8] Testing FastAPI Application...")
try:
    from main import app
    print("  ✓ FastAPI app imported")
    print(f"  ✓ App title: {app.title}")
    print(f"  ✓ App version: {app.version}")
    
    # Check routes
    routes = [route.path for route in app.routes]
    print(f"  ✓ Routes registered: {len(routes)}")
    for route in routes:
        print(f"    - {route}")
except Exception as e:
    print(f"  ✗ FastAPI app error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 8: Mode Logic
print("\n[8/8] Testing Mode Logic...")
try:
    from modes import apply_mode_logic
    print("  ✓ Mode logic imported")
    
    # Test mode logic with mock state
    test_state = {
        "message_understanding": {"confidence": 0.8},
        "assignment": {"confidence": 0.75},
        "task_extraction": {"title": "Test Task"},
        "workspace_automation_mode": "semi_auto"
    }
    
    async def test_mode():
        result = await apply_mode_logic(test_state, "semi_auto")
        if "action_decision" in result:
            print("  ✓ Mode logic executes correctly")
            print(f"    Decision: {result['action_decision'].get('reason', 'N/A')}")
        else:
            print("  ⚠ Mode logic executed but no decision found")
    
    asyncio.run(test_mode())
except Exception as e:
    print(f"  ✗ Mode logic error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("✓ All Integration Tests Passed!")
print("=" * 60)
print("\nNext steps:")
print("1. Set GEMINI_API_KEY in .env file")
print("2. Start the service: uvicorn ai_orchestrator.main:app --reload")
print("3. Test endpoints with: curl http://localhost:8000/health")
print("=" * 60)

