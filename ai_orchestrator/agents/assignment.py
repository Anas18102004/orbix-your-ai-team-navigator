"""Agent 3: Assignment Agent."""
import json
from typing import Dict, Any, List
try:
    from ..models.llm import get_reasoning_model
    from ..models.schemas import AssignmentOutput
    from ..prompts.agent_prompts import ASSIGNMENT_PROMPT
    from ..tools.backend_tools import get_workspace_members, get_member_workload
except ImportError:
    from models.llm import get_reasoning_model
    from models.schemas import AssignmentOutput
    from prompts.agent_prompts import ASSIGNMENT_PROMPT
    from tools.backend_tools import get_workspace_members, get_member_workload


async def assignment_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Suggest task assignment based on workload and context.
    
    Input state keys:
        - workspace_id: str
        - task_extraction: Dict (from task extraction agent)
    
    Output state keys:
        - assignment: AssignmentOutput
    """
    llm = get_reasoning_model()
    workspace_id = state.get("workspace_id")
    task_extraction = state.get("task_extraction", {})
    
    if not workspace_id:
        return {
            **state,
            "assignment": AssignmentOutput(
                suggested_assignee_id=None,
                candidate_assignees=[],
                ai_assignment_reason="No workspace ID provided",
                confidence=0.0
            ).dict()
        }
    
    # Get workspace members
    members = await get_workspace_members(workspace_id)
    
    # Get workload for each member
    workloads = {}
    members_info = []
    workloads_info = []
    
    for member in members:
        user_id = str(member.get("_id", ""))
        if not user_id:
            continue
        
        workload = await get_member_workload(workspace_id, user_id)
        workloads[user_id] = workload
        
        members_info.append(
            f"- {member.get('name', 'Unknown')} (ID: {user_id}, Role: {member.get('role', 'crew')})"
        )
        workloads_info.append(
            f"- {member.get('name', 'Unknown')}: {workload.get('total_tasks', 0)} tasks "
            f"({workload.get('todo', 0)} todo, {workload.get('in_progress', 0)} in progress)"
        )
    
    # Prepare prompt
    prompt = ASSIGNMENT_PROMPT.format_messages(
        task_title=task_extraction.get("title", "Untitled Task"),
        task_description=task_extraction.get("description", ""),
        priority=task_extraction.get("suggested_priority", "P2"),
        task_type=task_extraction.get("task_type", "other"),
        members_info="\n".join(members_info),
        workloads_info="\n".join(workloads_info)
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
        assignment = AssignmentOutput(**result_dict)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing assignment output: {e}")
        # Fallback: assign to first member or leave unassigned
        assignment = AssignmentOutput(
            suggested_assignee_id=None,
            candidate_assignees=[str(m.get("_id", "")) for m in members[:3] if m.get("_id")],
            ai_assignment_reason="Unable to determine optimal assignment",
            confidence=0.0
        )
    
    return {
        **state,
        "assignment": assignment.dict(),
        "members": members,
        "workloads": workloads
    }

