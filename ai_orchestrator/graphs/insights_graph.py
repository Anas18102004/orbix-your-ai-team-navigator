"""Graph 4: Insights Workflow (Omni-only)."""
from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, END
try:
    from ..agents.safety import safety_policy_agent
    from ..agents.insights import insights_agent
    from ..tools.backend_tools import get_workspace_members
except ImportError:
    from agents.safety import safety_policy_agent
    from agents.insights import insights_agent
    from tools.backend_tools import get_workspace_members


async def check_omni_role(state: Dict[str, Any]) -> Dict[str, Any]:
    """Check if user has Omni role."""
    workspace_id = state.get("workspace_id")
    user_id = state.get("user_id")
    
    if not workspace_id or not user_id:
        return {
            **state,
            "is_omni": False,
            "error": "Missing workspace_id or user_id"
        }
    
    # Get workspace members
    members = await get_workspace_members(workspace_id)
    
    # Check if user is omni
    user_member = next(
        (m for m in members if str(m.get("_id", "")) == str(user_id)),
        None
    )
    
    is_omni = user_member and user_member.get("role") == "omni"
    
    return {
        **state,
        "is_omni": is_omni
    }


def should_continue_after_omni_check(state: Dict[str, Any]) -> Literal["generate_insights", "end"]:
    """Check if user is Omni."""
    if state.get("is_omni", False):
        return "generate_insights"
    return "end"


def create_insights_graph():
    """Create the insights LangGraph workflow."""
    workflow = StateGraph(dict)
    
    # Add nodes
    workflow.add_node("safety_check", safety_policy_agent)
    workflow.add_node("check_omni", check_omni_role)
    workflow.add_node("generate_insights", insights_agent)
    
    # Set entry point
    workflow.set_entry_point("safety_check")
    
    # Add edges
    workflow.add_edge("safety_check", "check_omni")
    workflow.add_conditional_edges(
        "check_omni",
        should_continue_after_omni_check,
        {
            "generate_insights": "generate_insights",
            "end": END
        }
    )
    workflow.add_edge("generate_insights", END)
    
    return workflow.compile()


# Global graph instance
insights_graph = create_insights_graph()

