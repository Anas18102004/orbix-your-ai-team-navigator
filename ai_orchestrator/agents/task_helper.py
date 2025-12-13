"""Agent 4: Task Helper Agent."""
import json
from typing import Dict, Any
try:
    from ..models.llm import get_chat_model_for_conversation
    from ..models.schemas import TaskHelperOutput
    from ..prompts.agent_prompts import TASK_HELPER_PROMPT
    from ..tools.backend_tools import get_task, get_related_tasks
    from ..tools.rag_tools import search_workspace_context
except ImportError:
    from models.llm import get_chat_model_for_conversation
    from models.schemas import TaskHelperOutput
    from prompts.agent_prompts import TASK_HELPER_PROMPT
    from tools.backend_tools import get_task, get_related_tasks
    from tools.rag_tools import search_workspace_context


async def task_helper_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Provide help and guidance for a task.
    
    Input state keys:
        - workspace_id: str
        - task_id: str
        - user_question: str (optional)
    
    Output state keys:
        - task_help: TaskHelperOutput
    """
    llm = get_chat_model_for_conversation()
    workspace_id = state.get("workspace_id")
    task_id = state.get("task_id")
    user_question = state.get("user_question", "How can I complete this task?")
    
    # Get task details
    task = await get_task(task_id)
    if not task:
        task = {"title": "Unknown Task", "description": "", "status": "todo", "priority": "P2"}
    
    # Get related tasks
    related_tasks = await get_related_tasks(task_id, workspace_id)
    related_tasks_text = "\n".join([
        f"- {t.get('title', 'Untitled')} ({t.get('status', 'unknown')})"
        for t in related_tasks[:5]
    ]) if related_tasks else "None"
    
    # Get workspace context via RAG
    workspace_context_results = await search_workspace_context(
        workspace_id,
        f"{task.get('title', '')} {task.get('description', '')}",
        top_k=3
    )
    workspace_context = "\n".join([
        f"- {r.get('text', '')[:200]}"
        for r in workspace_context_results
    ]) if workspace_context_results else "No relevant context found"
    
    # Prepare prompt
    prompt = TASK_HELPER_PROMPT.format_messages(
        task_title=task.get("title", "Unknown Task"),
        task_description=task.get("description", ""),
        task_status=task.get("status", "todo"),
        priority=task.get("priority", "P2"),
        assignee_name=task.get("assignee", {}).get("name", "Unassigned") if isinstance(task.get("assignee"), dict) else "Unassigned",
        related_tasks=related_tasks_text,
        workspace_context=workspace_context,
        user_question=user_question
    )
    
    # Call LLM
    response = await llm.ainvoke(prompt)
    content = response.content
    
    # Parse JSON response
    try:
        # Try to extract JSON from markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        result_dict = json.loads(content)
        task_help = TaskHelperOutput(**result_dict)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing task helper output: {e}")
        # Fallback: use raw response as explanation
        task_help = TaskHelperOutput(
            explanation=content[:500],
            step_by_step_plan=["Review the task", "Gather requirements", "Implement solution", "Test and verify"],
            risk_notes=["Unable to parse structured response"]
        )
    
    return {
        **state,
        "task_help": task_help.dict()
    }

