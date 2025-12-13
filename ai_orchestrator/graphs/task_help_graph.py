"""Graph 2: Task Help Workflow."""
from langgraph.graph import StateGraph, END
try:
    from ..agents.safety import safety_policy_agent
    from ..agents.task_helper import task_helper_agent
    from ..agents.summarization import summarization_agent
except ImportError:
    from agents.safety import safety_policy_agent
    from agents.task_helper import task_helper_agent
    from agents.summarization import summarization_agent


def create_task_help_graph():
    """Create the task help LangGraph workflow."""
    workflow = StateGraph(dict)
    
    # Add nodes
    workflow.add_node("safety_check", safety_policy_agent)
    workflow.add_node("task_helper", task_helper_agent)
    workflow.add_node("summarization", summarization_agent)
    
    # Set entry point
    workflow.set_entry_point("safety_check")
    
    # Add edges
    workflow.add_edge("safety_check", "task_helper")
    workflow.add_edge("task_helper", "summarization")
    workflow.add_edge("summarization", END)
    
    return workflow.compile()


# Global graph instance
task_help_graph = create_task_help_graph()

