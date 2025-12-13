"""Graph 3: Ask Orbix Chat Workflow."""
from langgraph.graph import StateGraph, END
try:
    from ..agents.safety import safety_policy_agent
    from ..agents.workspace_assistant import workspace_assistant_agent
    from ..agents.summarization import summarization_agent
except ImportError:
    from agents.safety import safety_policy_agent
    from agents.workspace_assistant import workspace_assistant_agent
    from agents.summarization import summarization_agent


def create_ask_orbix_chat_graph():
    """Create the Ask Orbix chat LangGraph workflow."""
    workflow = StateGraph(dict)
    
    # Add nodes
    workflow.add_node("safety_check", safety_policy_agent)
    workflow.add_node("workspace_assistant", workspace_assistant_agent)
    workflow.add_node("summarization", summarization_agent)
    
    # Set entry point
    workflow.set_entry_point("safety_check")
    
    # Add edges
    workflow.add_edge("safety_check", "workspace_assistant")
    workflow.add_edge("workspace_assistant", "summarization")
    workflow.add_edge("summarization", END)
    
    return workflow.compile()


# Global graph instance
ask_orbix_chat_graph = create_ask_orbix_chat_graph()

