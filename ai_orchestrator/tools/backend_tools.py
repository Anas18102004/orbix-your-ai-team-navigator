"""Tools for calling the Orbix backend API."""
import httpx
from typing import List, Dict, Optional, Any
from langchain.tools import tool
try:
    from ..config import settings
except ImportError:
    from config import settings


# Base HTTP client
async def _make_request(
    method: str,
    endpoint: str,
    data: Optional[Dict] = None,
    params: Optional[Dict] = None
) -> Dict[str, Any]:
    """Make HTTP request to backend."""
    url = f"{settings.orbix_backend_url}{endpoint}"
    headers = {}
    
    if settings.backend_api_key:
        headers["Authorization"] = f"Bearer {settings.backend_api_key}"
    
    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=method,
            url=url,
            json=data,
            params=params,
            headers=headers,
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()


@tool
async def get_workspace_members(workspace_id: str) -> List[Dict[str, Any]]:
    """
    Get all members of a workspace.
    
    Args:
        workspace_id: The workspace ID
    
    Returns:
        List of workspace members with their roles
    """
    # Note: This assumes the backend has an endpoint for this
    # The actual endpoint might require authentication via a token
    # For now, we'll use a placeholder structure
    try:
        result = await _make_request(
            "GET",
            f"/api/workspaces/{workspace_id}/members"
        )
        return result.get("members", [])
    except Exception as e:
        print(f"Error fetching workspace members: {e}")
        return []


@tool
async def get_member_workload(workspace_id: str, user_id: str) -> Dict[str, Any]:
    """
    Get a member's current workload (number of tasks, etc.).
    
    Args:
        workspace_id: The workspace ID
        user_id: The user ID
    
    Returns:
        Dictionary with workload information
    """
    try:
        # Get user's tasks
        result = await _make_request(
            "GET",
            f"/api/workspaces/{workspace_id}/tasks/my",
            params={"userId": user_id}
        )
        tasks = result.get("tasks", [])
        
        # Count by status
        todo_count = sum(1 for t in tasks if t.get("status") == "todo")
        in_progress_count = sum(1 for t in tasks if t.get("status") == "in_progress")
        done_count = sum(1 for t in tasks if t.get("status") == "done")
        
        return {
            "total_tasks": len(tasks),
            "todo": todo_count,
            "in_progress": in_progress_count,
            "done": done_count,
            "high_priority": sum(1 for t in tasks if t.get("priority") in ["P0", "P1"])
        }
    except Exception as e:
        print(f"Error fetching member workload: {e}")
        return {
            "total_tasks": 0,
            "todo": 0,
            "in_progress": 0,
            "done": 0,
            "high_priority": 0
        }


@tool
async def get_workspace_config(workspace_id: str) -> Dict[str, Any]:
    """
    Get workspace configuration including AI automation mode.
    
    Args:
        workspace_id: The workspace ID
    
    Returns:
        Dictionary with workspace config including aiAutomationMode
    """
    try:
        # This would need to be added to the backend
        # For now, return default
        result = await _make_request(
            "GET",
            f"/api/workspaces/{workspace_id}"
        )
        workspace = result.get("workspace", {})
        
        # Default to assist mode if not set
        return {
            "workspace_id": workspace_id,
            "ai_automation_mode": workspace.get("aiAutomationMode", "assist"),
            "name": workspace.get("name", ""),
            "purpose": workspace.get("purpose", "")
        }
    except Exception as e:
        print(f"Error fetching workspace config: {e}")
        return {
            "workspace_id": workspace_id,
            "ai_automation_mode": "assist"  # Safe default
        }


@tool
async def get_channel_config(channel_id: str) -> Dict[str, Any]:
    """
    Get channel configuration including AI mode.
    
    Args:
        channel_id: The channel ID
    
    Returns:
        Dictionary with channel config including aiMode
    """
    try:
        # This would need to be added to the backend
        # For now, we'll need to get it from the channel endpoint
        # Placeholder - actual implementation depends on backend API
        return {
            "channel_id": channel_id,
            "ai_mode": "active"  # Default, should be fetched from backend
        }
    except Exception as e:
        print(f"Error fetching channel config: {e}")
        return {
            "channel_id": channel_id,
            "ai_mode": "off"  # Safe default
        }


@tool
async def create_task(workspace_id: str, task_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a task in the workspace.
    
    Args:
        workspace_id: The workspace ID
        task_data: Dictionary with task fields (title, description, priority, assigneeId, etc.)
    
    Returns:
        Created task object
    """
    try:
        result = await _make_request(
            "POST",
            f"/api/workspaces/{workspace_id}/tasks",
            data=task_data
        )
        return result.get("task", {})
    except Exception as e:
        print(f"Error creating task: {e}")
        raise


@tool
async def create_task_proposal(workspace_id: str, proposal_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a task proposal (for Assist mode).
    
    Args:
        workspace_id: The workspace ID
        proposal_data: Dictionary with proposal fields
    
    Returns:
        Created proposal object
    """
    # This endpoint would need to be added to the backend
    # For now, we'll create it as a task with a special status or flag
    try:
        # Create as unassigned task with a note that it's a proposal
        task_data = {
            **proposal_data,
            "status": "todo",
            "assigneeId": None,  # Proposals are unassigned
            "aiNotes": "AI-generated proposal - pending approval"
        }
        return await create_task(workspace_id, task_data)
    except Exception as e:
        print(f"Error creating task proposal: {e}")
        raise


@tool
async def update_task(
    workspace_id: str,
    task_id: str,
    updates: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Update an existing task.
    
    Args:
        workspace_id: The workspace ID
        task_id: The task ID
        updates: Dictionary with fields to update
    
    Returns:
        Updated task object
    """
    try:
        result = await _make_request(
            "PATCH",
            f"/api/workspaces/{workspace_id}/tasks/{task_id}",
            data=updates
        )
        return result.get("task", {})
    except Exception as e:
        print(f"Error updating task: {e}")
        raise


@tool
async def get_task(task_id: str) -> Dict[str, Any]:
    """
    Get a task by ID.
    
    Args:
        task_id: The task ID
    
    Returns:
        Task object
    """
    try:
        # This would need a GET /tasks/:taskId endpoint
        # For now, we'll search through workspace tasks
        # Placeholder implementation
        return {}
    except Exception as e:
        print(f"Error fetching task: {e}")
        return {}


@tool
async def get_related_tasks(task_id: str, workspace_id: str) -> List[Dict[str, Any]]:
    """
    Get tasks related to a given task.
    
    Args:
        task_id: The task ID
        workspace_id: The workspace ID
    
    Returns:
        List of related tasks
    """
    try:
        # Get all tasks in workspace and filter by similarity
        result = await _make_request(
            "GET",
            f"/api/workspaces/{workspace_id}/tasks"
        )
        tasks = result.get("tasks", [])
        # Simple implementation - could be enhanced with semantic similarity
        return tasks[:5]  # Return first 5 as placeholder
    except Exception as e:
        print(f"Error fetching related tasks: {e}")
        return []


@tool
async def get_workspace_stats(workspace_id: str) -> Dict[str, Any]:
    """
    Get workspace statistics for insights.
    
    Args:
        workspace_id: The workspace ID
    
    Returns:
        Dictionary with workspace statistics
    """
    try:
        # Get all tasks
        tasks_result = await _make_request(
            "GET",
            f"/api/workspaces/{workspace_id}/tasks"
        )
        tasks = tasks_result.get("tasks", [])
        
        # Calculate stats
        total_tasks = len(tasks)
        by_status = {}
        by_priority = {}
        
        for task in tasks:
            status = task.get("status", "todo")
            priority = task.get("priority", "P2")
            by_status[status] = by_status.get(status, 0) + 1
            by_priority[priority] = by_priority.get(priority, 0) + 1
        
        # Get members
        members_result = await _make_request(
            "GET",
            f"/api/workspaces/{workspace_id}/members"
        )
        members = members_result.get("members", [])
        
        return {
            "total_tasks": total_tasks,
            "tasks_by_status": by_status,
            "tasks_by_priority": by_priority,
            "total_members": len(members),
            "members_by_role": {
                m.get("role", "crew"): sum(1 for mem in members if mem.get("role") == m.get("role"))
                for m in members
            }
        }
    except Exception as e:
        print(f"Error fetching workspace stats: {e}")
        return {}


@tool
async def send_notification(
    user_id: str,
    workspace_id: str,
    notification_type: str,
    entity_id: str,
    message: str
) -> Dict[str, Any]:
    """
    Send a notification to a user.
    
    Args:
        user_id: The user ID
        workspace_id: The workspace ID
        notification_type: Type of notification (e.g., 'TASK_ASSIGNED')
        entity_id: ID of the related entity
        message: Notification message
    
    Returns:
        Created notification object
    """
    try:
        result = await _make_request(
            "POST",
            "/api/notifications",
            data={
                "userId": user_id,
                "workspaceId": workspace_id,
                "type": notification_type,
                "entityId": entity_id,
                "message": message
            }
        )
        return result
    except Exception as e:
        print(f"Error sending notification: {e}")
        raise


@tool
async def post_bot_message(
    workspace_id: str,
    channel_id: str,
    content: str
) -> Dict[str, Any]:
    """
    Post a bot message to a channel.
    
    Args:
        workspace_id: The workspace ID
        channel_id: The channel ID
        content: Message content
    
    Returns:
        Created message object
    """
    try:
        # This would need a special endpoint or a bot user ID
        # For now, placeholder
        result = await _make_request(
            "POST",
            f"/api/workspaces/{workspace_id}/channels/{channel_id}/messages",
            data={
                "content": content,
                "senderId": "orbix-ai-bot"  # Would need actual bot user ID
            }
        )
        return result.get("message", {})
    except Exception as e:
        print(f"Error posting bot message: {e}")
        raise

