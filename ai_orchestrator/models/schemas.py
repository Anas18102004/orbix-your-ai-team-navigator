"""Pydantic models for agent inputs and outputs."""
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# Agent 1: Message Understanding Output
class MessageUnderstandingOutput(BaseModel):
    """Output from Message Understanding Agent."""
    is_task_candidate: bool = Field(description="Whether the message represents a potential task")
    category: Literal["bug", "feature", "request", "info", "chitchat", "question", "other"] = Field(
        description="Category of the message"
    )
    urgency_estimate: Literal["low", "medium", "high"] = Field(
        description="Estimated urgency level"
    )
    cleaned_text: str = Field(description="Cleaned and normalized message text")
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score for the classification"
    )


# Agent 2: Task Extraction Output
class TaskExtractionOutput(BaseModel):
    """Output from Task Extraction Agent."""
    title: str = Field(description="Task title")
    description: str = Field(description="Detailed task description")
    suggested_priority: Literal["P0", "P1", "P2", "P3"] = Field(
        description="Suggested priority level"
    )
    task_type: Literal["bug", "feature", "deployment", "documentation", "refactor", "other"] = Field(
        description="Type of task"
    )
    estimated_effort: Optional[Literal["small", "medium", "large"]] = Field(
        default=None,
        description="Estimated effort required"
    )


# Agent 3: Assignment Output
class AssignmentOutput(BaseModel):
    """Output from Assignment Agent."""
    suggested_assignee_id: Optional[str] = Field(
        default=None,
        description="ID of the suggested assignee"
    )
    candidate_assignees: List[str] = Field(
        default_factory=list,
        description="List of candidate assignee IDs"
    )
    ai_assignment_reason: str = Field(
        description="Reason for the assignment suggestion"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in the assignment"
    )


# Agent 4: Task Helper Output
class TaskHelperOutput(BaseModel):
    """Output from Task Helper Agent."""
    explanation: str = Field(description="Explanation of the task")
    step_by_step_plan: List[str] = Field(
        description="Step-by-step plan to complete the task"
    )
    risk_notes: List[str] = Field(
        default_factory=list,
        description="Potential risks or blockers"
    )
    related_context: Optional[str] = Field(
        default=None,
        description="Related context from workspace"
    )


# Agent 5: Workspace Assistant Output
class WorkspaceAssistantOutput(BaseModel):
    """Output from Workspace Assistant Agent."""
    answer: str = Field(description="Answer to the user's question")
    sources: List[str] = Field(
        default_factory=list,
        description="Sources or references used"
    )
    suggested_actions: Optional[List[str]] = Field(
        default=None,
        description="Suggested follow-up actions"
    )


# Agent 6: Summarization Output
class SummarizationOutput(BaseModel):
    """Output from Summarization Agent."""
    summary: str = Field(description="Summary text")
    key_points: List[str] = Field(
        description="Key points extracted"
    )
    metadata: dict = Field(
        default_factory=dict,
        description="Additional metadata"
    )


# Agent 7: Insights Output
class InsightsOutput(BaseModel):
    """Output from Insights Agent."""
    summary: str = Field(description="Workspace activity summary")
    actionable_suggestions: List[str] = Field(
        min_length=3,
        max_length=5,
        description="3-5 actionable process suggestions"
    )
    metrics: Optional[dict] = Field(
        default=None,
        description="Key metrics and statistics"
    )


# Safety Check Output
class SafetyCheckOutput(BaseModel):
    """Output from Safety & Policy Agent."""
    allowed: bool = Field(description="Whether the action is allowed")
    reason: Optional[str] = Field(
        default=None,
        description="Reason for allow/deny"
    )
    channel_ai_mode: Literal["active", "off"] = Field(
        description="Channel AI mode status"
    )
    workspace_automation_mode: Literal["assist", "semi_auto", "full_auto"] = Field(
        description="Workspace automation mode"
    )

