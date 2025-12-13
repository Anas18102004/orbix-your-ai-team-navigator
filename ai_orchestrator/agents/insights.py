"""Agent 7: Insights Agent (Omni-only)."""
import json
from typing import Dict, Any
try:
    from ..models.llm import get_reasoning_model
    from ..models.schemas import InsightsOutput
    from ..prompts.agent_prompts import INSIGHTS_PROMPT
    from ..tools.backend_tools import get_workspace_stats
except ImportError:
    from models.llm import get_reasoning_model
    from models.schemas import InsightsOutput
    from prompts.agent_prompts import INSIGHTS_PROMPT
    from tools.backend_tools import get_workspace_stats


async def insights_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate workspace insights and process suggestions.
    
    Input state keys:
        - workspace_id: str
    
    Output state keys:
        - insights: InsightsOutput
    """
    llm = get_reasoning_model()
    workspace_id = state.get("workspace_id")
    
    # Get workspace stats
    stats = await get_workspace_stats(workspace_id)
    
    # Format stats for prompt
    workspace_stats = f"""
    Total Tasks: {stats.get('total_tasks', 0)}
    Tasks by Status: {stats.get('tasks_by_status', {})}
    Tasks by Priority: {stats.get('tasks_by_priority', {})}
    Total Members: {stats.get('total_members', 0)}
    Members by Role: {stats.get('members_by_role', {})}
    """
    
    task_distribution = str(stats.get('tasks_by_status', {}))
    member_activity = str(stats.get('members_by_role', {}))
    
    # Prepare prompt
    prompt = INSIGHTS_PROMPT.format_messages(
        workspace_stats=workspace_stats,
        task_distribution=task_distribution,
        member_activity=member_activity
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
        insights = InsightsOutput(**result_dict)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing insights output: {e}")
        # Fallback
        insights = InsightsOutput(
            summary="Workspace analysis completed",
            actionable_suggestions=[
                "Review task distribution for balance",
                "Consider workload allocation",
                "Monitor high-priority tasks"
            ],
            metrics=stats
        )
    
    return {
        **state,
        "insights": insights.dict()
    }

