"""Agent 5: Workspace Assistant Agent."""
from typing import Dict, Any, List
try:
    from ..models.llm import get_chat_model_for_conversation
    from ..models.schemas import WorkspaceAssistantOutput
    from ..prompts.agent_prompts import WORKSPACE_ASSISTANT_PROMPT
    from ..tools.rag_tools import search_workspace_context
    from ..tools.backend_tools import get_workspace_stats
except ImportError:
    from models.llm import get_chat_model_for_conversation
    from models.schemas import WorkspaceAssistantOutput
    from prompts.agent_prompts import WORKSPACE_ASSISTANT_PROMPT
    from tools.rag_tools import search_workspace_context
    from tools.backend_tools import get_workspace_stats
from langchain_core.messages import HumanMessage, AIMessage


async def workspace_assistant_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Conversational agent for workspace questions.
    
    Input state keys:
        - workspace_id: str
        - user_message: str
        - chat_history: List[Dict] (optional)
    
    Output state keys:
        - assistant_response: WorkspaceAssistantOutput
    """
    llm = get_chat_model_for_conversation()
    workspace_id = state.get("workspace_id")
    user_message = state.get("user_message", "")
    
    # Get workspace context via RAG
    workspace_context_results = await search_workspace_context(
        workspace_id,
        user_message,
        top_k=5
    )
    workspace_context = "\n".join([
        f"- {r.get('text', '')[:300]}"
        for r in workspace_context_results
    ]) if workspace_context_results else "No relevant context found"
    
    # Get workspace stats for task summary
    stats = await get_workspace_stats(workspace_id)
    task_summary = f"""
    Total Tasks: {stats.get('total_tasks', 0)}
    By Status: {stats.get('tasks_by_status', {})}
    By Priority: {stats.get('tasks_by_priority', {})}
    """
    
    # Build chat history
    chat_history = state.get("chat_history", [])
    messages = []
    
    # Convert chat history to LangChain messages
    for msg in chat_history[-10:]:  # Last 10 messages
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "assistant":
            messages.append(AIMessage(content=msg.get("content", "")))
    
    # Prepare prompt
    prompt = WORKSPACE_ASSISTANT_PROMPT.format_messages(
        user_message=user_message,
        workspace_context=workspace_context,
        task_summary=task_summary
    )
    
    # Insert chat history before the last human message
    if messages:
        prompt = prompt[:-1] + messages + prompt[-1:]
    
    # Call LLM
    response = await llm.ainvoke(prompt)
    answer = response.content
    
    # Create response object
    assistant_response = WorkspaceAssistantOutput(
        answer=answer,
        sources=[r.get("type", "context") for r in workspace_context_results[:3]],
        suggested_actions=None
    )
    
    return {
        **state,
        "assistant_response": assistant_response.dict()
    }

