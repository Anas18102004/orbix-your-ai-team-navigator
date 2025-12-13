"""Mode logic for AI automation (Assist, Semi-Auto, Full Auto)."""
from typing import Dict, Any, Literal
try:
    from .config import settings
except ImportError:
    from config import settings


async def apply_mode_logic(
    state: Dict[str, Any],
    mode: Literal["assist", "semi_auto", "full_auto"]
) -> Dict[str, Any]:
    """
    Apply mode-specific logic to determine action.
    
    Args:
        state: Current state with task_extraction and assignment
        mode: Automation mode
    
    Returns:
        Updated state with action_decision
    """
    task_extraction = state.get("task_extraction", {})
    assignment = state.get("assignment", {})
    message_understanding = state.get("message_understanding", {})
    
    # Get confidence scores
    understanding_confidence = message_understanding.get("confidence", 0.0)
    assignment_confidence = assignment.get("confidence", 0.0)
    
    # Combined confidence (weighted average)
    combined_confidence = (understanding_confidence * 0.6 + assignment_confidence * 0.4)
    
    action_decision = {
        "should_create_task": False,
        "should_assign": False,
        "should_create_proposal": False,
        "reason": ""
    }
    
    if mode == "assist":
        # Assist mode: always create proposal only
        action_decision["should_create_proposal"] = True
        action_decision["reason"] = "Assist mode: creating proposal for human review"
    
    elif mode == "semi_auto":
        # Semi-Auto: auto-create if confidence is high
        if combined_confidence >= settings.semi_auto_confidence_threshold:
            action_decision["should_create_task"] = True
            if assignment_confidence >= settings.semi_auto_confidence_threshold:
                action_decision["should_assign"] = True
            action_decision["reason"] = f"Semi-auto mode: high confidence ({combined_confidence:.2f})"
        else:
            action_decision["should_create_proposal"] = True
            action_decision["reason"] = f"Semi-auto mode: low confidence ({combined_confidence:.2f}), creating proposal"
    
    elif mode == "full_auto":
        # Full Auto: auto-create for high and medium confidence
        if combined_confidence >= settings.full_auto_confidence_threshold:
            action_decision["should_create_task"] = True
            if assignment_confidence >= settings.full_auto_confidence_threshold:
                action_decision["should_assign"] = True
            else:
                # Create unassigned task
                action_decision["should_assign"] = False
            action_decision["reason"] = f"Full-auto mode: confidence ({combined_confidence:.2f}) above threshold"
        else:
            # Even in full-auto, very low confidence gets proposal
            action_decision["should_create_proposal"] = True
            action_decision["reason"] = f"Full-auto mode: very low confidence ({combined_confidence:.2f}), creating proposal"
    
    return {
        **state,
        "action_decision": action_decision,
        "combined_confidence": combined_confidence
    }

