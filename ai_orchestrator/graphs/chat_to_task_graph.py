"""Graph 1: Chat to Task Workflow."""
from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END
try:
    from ..agents.safety import safety_policy_agent
    from ..agents.message_understanding import message_understanding_agent
    from ..agents.task_extraction import task_extraction_agent
    from ..agents.assignment import assignment_agent
    from ..modes import apply_mode_logic
    from ..tools.backend_tools import create_task, create_task_proposal, post_bot_message, send_notification
except ImportError:
    from agents.safety import safety_policy_agent
    from agents.message_understanding import message_understanding_agent
    from agents.task_extraction import task_extraction_agent
    from agents.assignment import assignment_agent
    from modes import apply_mode_logic
    from tools.backend_tools import create_task, create_task_proposal, post_bot_message, send_notification


def should_continue_after_understanding(state: Dict[str, Any]) -> Literal["extract_task", "end"]:
    """Check if message is a task candidate."""
    understanding = state.get("message_understanding", {})
    if understanding.get("is_task_candidate", False):
        return "extract_task"
    return "end"


async def execute_action(state: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the action based on mode decision."""
    action_decision = state.get("action_decision", {})
    workspace_id = state.get("workspace_id")
    channel_id = state.get("channel_id")
    task_extraction = state.get("task_extraction", {})
    assignment = state.get("assignment", {})
    message_understanding = state.get("message_understanding", {})
    
    result = {
        "task_created": False,
        "proposal_created": False,
        "task_id": None,
        "bot_message_posted": False
    }
    
    try:
        if action_decision.get("should_create_task"):
            # Create actual task
            task_data = {
                "title": task_extraction.get("title", "Untitled Task"),
                "description": task_extraction.get("description", ""),
                "priority": task_extraction.get("suggested_priority", "P2"),
                "assigneeId": assignment.get("suggested_assignee_id") if action_decision.get("should_assign") else None,
                "relatedMessageId": state.get("message_id"),
                "aiNotes": f"AI-generated task from message",
                "aiAssignmentReason": assignment.get("ai_assignment_reason") if action_decision.get("should_assign") else None
            }
            
            created_task = await create_task(workspace_id, task_data)
            result["task_created"] = True
            result["task_id"] = str(created_task.get("_id", ""))
            
            # Post bot message
            bot_message = f"✅ Created task: {task_extraction.get('title')}"
            if action_decision.get("should_assign") and assignment.get("suggested_assignee_id"):
                bot_message += f" (assigned)"
            await post_bot_message(workspace_id, channel_id, bot_message)
            result["bot_message_posted"] = True
            
            # Send notification if assigned
            if action_decision.get("should_assign") and assignment.get("suggested_assignee_id"):
                await send_notification(
                    user_id=assignment.get("suggested_assignee_id"),
                    workspace_id=workspace_id,
                    notification_type="TASK_ASSIGNED",
                    entity_id=result["task_id"],
                    message=f"You've been assigned: {task_extraction.get('title')}"
                )
        
        elif action_decision.get("should_create_proposal"):
            # Create proposal
            proposal_data = {
                "title": task_extraction.get("title", "Untitled Task"),
                "description": task_extraction.get("description", ""),
                "priority": task_extraction.get("suggested_priority", "P2"),
                "relatedMessageId": state.get("message_id"),
                "aiNotes": f"AI-generated proposal - {action_decision.get('reason', '')}"
            }
            
            created_proposal = await create_task_proposal(workspace_id, proposal_data)
            result["proposal_created"] = True
            result["task_id"] = str(created_proposal.get("_id", ""))
            
            # Post bot message
            bot_message = f"💡 Task proposal created: {task_extraction.get('title')} (pending review)"
            await post_bot_message(workspace_id, channel_id, bot_message)
            result["bot_message_posted"] = True
    
    except Exception as e:
        print(f"Error executing action: {e}")
        result["error"] = str(e)
    
    return {
        **state,
        "action_result": result
    }


def create_chat_to_task_graph():
    """Create the chat-to-task LangGraph workflow."""
    workflow = StateGraph(dict)
    
    # Add nodes
    workflow.add_node("safety_check", safety_policy_agent)
    workflow.add_node("message_understanding", message_understanding_agent)
    workflow.add_node("task_extraction", task_extraction_agent)
    workflow.add_node("assignment", assignment_agent)
    async def apply_mode_wrapper(state: Dict[str, Any]) -> Dict[str, Any]:
        """Wrapper to get mode from state and apply logic."""
        mode = state.get("workspace_automation_mode", "assist")
        return await apply_mode_logic(state, mode)
    
    workflow.add_node("apply_mode", apply_mode_wrapper)
    workflow.add_node("execute_action", execute_action)
    
    # Set entry point
    workflow.set_entry_point("safety_check")
    
    # Add edges
    workflow.add_edge("safety_check", "message_understanding")
    workflow.add_conditional_edges(
        "message_understanding",
        should_continue_after_understanding,
        {
            "extract_task": "task_extraction",
            "end": END
        }
    )
    workflow.add_edge("task_extraction", "assignment")
    workflow.add_edge("assignment", "apply_mode")
    workflow.add_edge("apply_mode", "execute_action")
    workflow.add_edge("execute_action", END)
    
    return workflow.compile()


# Global graph instance
chat_to_task_graph = create_chat_to_task_graph()

