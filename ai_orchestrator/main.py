"""FastAPI main application for Orbix AI Orchestrator."""
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
try:
    from .config import settings
    from .graphs.chat_to_task_graph import chat_to_task_graph
    from .graphs.task_help_graph import task_help_graph
    from .graphs.ask_orbix_chat_graph import ask_orbix_chat_graph
    from .graphs.insights_graph import insights_graph
except ImportError:
    # For direct execution
    from config import settings
    from graphs.chat_to_task_graph import chat_to_task_graph
    from graphs.task_help_graph import task_help_graph
    from graphs.ask_orbix_chat_graph import ask_orbix_chat_graph
    from graphs.insights_graph import insights_graph


app = FastAPI(
    title="Orbix AI Orchestrator",
    description="LangGraph-based AI service for workspace intelligence",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ChatToTaskRequest(BaseModel):
    """Request for chat-to-task endpoint."""
    message_id: str
    workspace_id: str
    channel_id: str
    text: str
    sender_id: str
    sender_name: Optional[str] = None
    channel_name: Optional[str] = None
    thread_context: Optional[str] = None


class ChatToTaskResponse(BaseModel):
    """Response from chat-to-task endpoint."""
    success: bool
    action_taken: str  # "task_created", "proposal_created", "no_action"
    task_id: Optional[str] = None
    reason: Optional[str] = None
    error: Optional[str] = None


class TaskHelpRequest(BaseModel):
    """Request for task help endpoint."""
    workspace_id: str
    task_id: str
    user_id: str
    question: Optional[str] = None


class TaskHelpResponse(BaseModel):
    """Response from task help endpoint."""
    success: bool
    explanation: str
    step_by_step_plan: List[str]
    risk_notes: List[str]
    related_context: Optional[str] = None
    error: Optional[str] = None


class AskOrbixRequest(BaseModel):
    """Request for Ask Orbix endpoint."""
    workspace_id: str
    user_id: str
    message: str
    history: Optional[List[Dict[str, str]]] = None


class AskOrbixResponse(BaseModel):
    """Response from Ask Orbix endpoint."""
    success: bool
    answer: str
    sources: List[str] = []
    suggested_actions: Optional[List[str]] = None
    error: Optional[str] = None


class InsightsRequest(BaseModel):
    """Request for insights endpoint."""
    workspace_id: str
    user_id: str


class InsightsResponse(BaseModel):
    """Response from insights endpoint."""
    success: bool
    summary: str
    actionable_suggestions: List[str]
    metrics: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# Authentication dependency
async def verify_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> bool:
    """Verify API key for service authentication."""
    if not settings.ai_service_api_key:
        # If no API key configured, allow all (development mode)
        return True
    
    if not x_api_key or x_api_key != settings.ai_service_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "orbix-ai-orchestrator"}


@app.post("/ai/chat_to_task", response_model=ChatToTaskResponse)
async def chat_to_task_endpoint(
    request: ChatToTaskRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Process a chat message and potentially create a task or proposal.
    
    Triggered when a new message is created in an AI-active channel.
    """
    try:
        # Prepare initial state
        initial_state = {
            "message_id": request.message_id,
            "workspace_id": request.workspace_id,
            "channel_id": request.channel_id,
            "message_text": request.text,
            "sender_id": request.sender_id,
            "sender_name": request.sender_name or "Unknown",
            "channel_name": request.channel_name or "Unknown",
            "thread_context": request.thread_context,
            "is_dm": False,  # Channel-based, not DM
            "explicit_consent": True  # Channel messages are public
        }
        
        # Run graph
        result = await chat_to_task_graph.ainvoke(initial_state)
        
        # Check safety
        safety_check = result.get("safety_check", {})
        if not safety_check.get("allowed", False):
            return ChatToTaskResponse(
                success=False,
                action_taken="blocked",
                reason=safety_check.get("reason", "Safety check failed")
            )
        
        # Check if task candidate
        understanding = result.get("message_understanding", {})
        if not understanding.get("is_task_candidate", False):
            return ChatToTaskResponse(
                success=True,
                action_taken="no_action",
                reason="Message is not a task candidate"
            )
        
        # Get action result
        action_result = result.get("action_result", {})
        
        if action_result.get("task_created"):
            return ChatToTaskResponse(
                success=True,
                action_taken="task_created",
                task_id=action_result.get("task_id"),
                reason=result.get("action_decision", {}).get("reason", "Task created")
            )
        elif action_result.get("proposal_created"):
            return ChatToTaskResponse(
                success=True,
                action_taken="proposal_created",
                task_id=action_result.get("task_id"),
                reason=result.get("action_decision", {}).get("reason", "Proposal created")
            )
        else:
            return ChatToTaskResponse(
                success=False,
                action_taken="no_action",
                reason="No action taken",
                error=action_result.get("error")
            )
    
    except Exception as e:
        print(f"Error in chat_to_task: {e}")
        return ChatToTaskResponse(
            success=False,
            action_taken="error",
            error=str(e)
        )


@app.post("/ai/task_help", response_model=TaskHelpResponse)
async def task_help_endpoint(
    request: TaskHelpRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Provide help and guidance for a task.
    
    Triggered when user clicks "Ask Orbix" on a task.
    """
    try:
        # Prepare initial state
        initial_state = {
            "workspace_id": request.workspace_id,
            "task_id": request.task_id,
            "user_id": request.user_id,
            "user_question": request.question or "How can I complete this task?",
            "is_dm": False,
            "explicit_consent": True
        }
        
        # Run graph
        result = await task_help_graph.ainvoke(initial_state)
        
        # Check safety
        safety_check = result.get("safety_check", {})
        if not safety_check.get("allowed", False):
            return TaskHelpResponse(
                success=False,
                explanation="",
                step_by_step_plan=[],
                risk_notes=[],
                error=safety_check.get("reason", "Safety check failed")
            )
        
        # Get task help
        task_help = result.get("task_help", {})
        
        return TaskHelpResponse(
            success=True,
            explanation=task_help.get("explanation", ""),
            step_by_step_plan=task_help.get("step_by_step_plan", []),
            risk_notes=task_help.get("risk_notes", []),
            related_context=task_help.get("related_context")
        )
    
    except Exception as e:
        print(f"Error in task_help: {e}")
        return TaskHelpResponse(
            success=False,
            explanation="",
            step_by_step_plan=[],
            risk_notes=[],
            error=str(e)
        )


@app.post("/ai/ask_orbix", response_model=AskOrbixResponse)
async def ask_orbix_endpoint(
    request: AskOrbixRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Conversational agent for workspace questions.
    
    Triggered when user asks Orbix a question in chat.
    """
    try:
        # Prepare initial state
        initial_state = {
            "workspace_id": request.workspace_id,
            "user_id": request.user_id,
            "user_message": request.message,
            "chat_history": request.history or [],
            "is_dm": False,
            "explicit_consent": True
        }
        
        # Run graph
        result = await ask_orbix_chat_graph.ainvoke(initial_state)
        
        # Check safety
        safety_check = result.get("safety_check", {})
        if not safety_check.get("allowed", False):
            return AskOrbixResponse(
                success=False,
                answer="",
                error=safety_check.get("reason", "Safety check failed")
            )
        
        # Get assistant response
        assistant_response = result.get("assistant_response", {})
        
        return AskOrbixResponse(
            success=True,
            answer=assistant_response.get("answer", ""),
            sources=assistant_response.get("sources", []),
            suggested_actions=assistant_response.get("suggested_actions")
        )
    
    except Exception as e:
        print(f"Error in ask_orbix: {e}")
        return AskOrbixResponse(
            success=False,
            answer="",
            error=str(e)
        )


@app.post("/ai/insights", response_model=InsightsResponse)
async def insights_endpoint(
    request: InsightsRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Generate workspace insights (Omni-only).
    
    Triggered when Omni user requests insights.
    """
    try:
        # Prepare initial state
        initial_state = {
            "workspace_id": request.workspace_id,
            "user_id": request.user_id,
            "is_dm": False,
            "explicit_consent": True
        }
        
        # Run graph
        result = await insights_graph.ainvoke(initial_state)
        
        # Check safety
        safety_check = result.get("safety_check", {})
        if not safety_check.get("allowed", False):
            return InsightsResponse(
                success=False,
                summary="",
                actionable_suggestions=[],
                error=safety_check.get("reason", "Safety check failed")
            )
        
        # Check Omni role
        if not result.get("is_omni", False):
            return InsightsResponse(
                success=False,
                summary="",
                actionable_suggestions=[],
                error="Omni role required"
            )
        
        # Get insights
        insights = result.get("insights", {})
        
        return InsightsResponse(
            success=True,
            summary=insights.get("summary", ""),
            actionable_suggestions=insights.get("actionable_suggestions", []),
            metrics=insights.get("metrics")
        )
    
    except Exception as e:
        print(f"Error in insights: {e}")
        return InsightsResponse(
            success=False,
            summary="",
            actionable_suggestions=[],
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.ai_service_host,
        port=settings.ai_service_port,
        reload=True
    )

