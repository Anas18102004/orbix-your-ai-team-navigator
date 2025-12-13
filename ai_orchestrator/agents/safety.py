"""Agent 8: Safety & Policy Agent."""
from typing import Dict, Any
try:
    from ..models.schemas import SafetyCheckOutput
    from ..tools.backend_tools import get_channel_config, get_workspace_config
except ImportError:
    from models.schemas import SafetyCheckOutput
    from tools.backend_tools import get_channel_config, get_workspace_config


async def safety_policy_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check safety and policy constraints before AI actions.
    
    Input state keys:
        - workspace_id: str
        - channel_id: str (optional, for channel-based actions)
        - is_dm: bool (default: False)
        - explicit_consent: bool (for DMs, default: False)
    
    Output state keys:
        - safety_check: SafetyCheckOutput
    """
    workspace_id = state.get("workspace_id")
    channel_id = state.get("channel_id")
    is_dm = state.get("is_dm", False)
    explicit_consent = state.get("explicit_consent", False)
    
    # Get workspace config
    workspace_config = await get_workspace_config(workspace_id)
    workspace_mode = workspace_config.get("ai_automation_mode", "assist")
    
    # Get channel config if channel_id provided
    channel_mode = "off"
    if channel_id:
        channel_config = await get_channel_config(channel_id)
        channel_mode = channel_config.get("ai_mode", "off")
    
    # Safety checks
    allowed = True
    reason = None
    
    # Check 1: For DMs, require explicit consent
    if is_dm and not explicit_consent:
        allowed = False
        reason = "DM processing requires explicit user consent"
    
    # Check 2: For channel-based actions, channel must have AI active
    if channel_id and channel_mode != "active":
        allowed = False
        reason = f"Channel AI mode is '{channel_mode}', not 'active'"
    
    # Check 3: Workspace must exist and have valid mode
    if workspace_mode not in ["assist", "semi_auto", "full_auto"]:
        allowed = False
        reason = f"Invalid workspace automation mode: {workspace_mode}"
    
    safety_check = SafetyCheckOutput(
        allowed=allowed,
        reason=reason,
        channel_ai_mode=channel_mode,
        workspace_automation_mode=workspace_mode
    )
    
    return {
        **state,
        "safety_check": safety_check.dict(),
        "workspace_automation_mode": workspace_mode,
        "channel_ai_mode": channel_mode
    }

