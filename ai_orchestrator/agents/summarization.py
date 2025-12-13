"""Agent 6: Summarization & Context Agent."""
import json
from typing import Dict, Any
try:
    from ..models.llm import get_chat_model_for_conversation
    from ..models.schemas import SummarizationOutput
    from ..prompts.agent_prompts import SUMMARIZATION_PROMPT
    from ..tools.rag_tools import index_workspace_context
except ImportError:
    from models.llm import get_chat_model_for_conversation
    from models.schemas import SummarizationOutput
    from prompts.agent_prompts import SUMMARIZATION_PROMPT
    from tools.rag_tools import index_workspace_context


async def summarization_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Summarize content and optionally index it for RAG.
    
    Input state keys:
        - content: str
        - content_type: str (e.g., 'thread', 'incident', 'sprint')
        - workspace_id: str
        - should_index: bool (default: True)
    
    Output state keys:
        - summarization: SummarizationOutput
    """
    llm = get_chat_model_for_conversation()
    content = state.get("content", "")
    content_type = state.get("content_type", "general")
    workspace_id = state.get("workspace_id")
    should_index = state.get("should_index", True)
    
    # Prepare prompt
    prompt = SUMMARIZATION_PROMPT.format_messages(
        content_type=content_type,
        content=content
    )
    
    # Call LLM
    response = await llm.ainvoke(prompt)
    response_content = response.content
    
    # Parse JSON response
    try:
        # Try to extract JSON from markdown code blocks if present
        if "```json" in response_content:
            response_content = response_content.split("```json")[1].split("```")[0].strip()
        elif "```" in response_content:
            response_content = response_content.split("```")[1].split("```")[0].strip()
        
        result_dict = json.loads(response_content)
        summarization = SummarizationOutput(**result_dict)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing summarization output: {e}")
        # Fallback
        summarization = SummarizationOutput(
            summary=response_content[:500],
            key_points=[],
            metadata={"type": content_type}
        )
    
    # Index for RAG if requested
    if should_index and workspace_id:
        await index_workspace_context(
            workspace_id=workspace_id,
            text=summarization.summary,
            context_type=content_type,
            metadata=summarization.metadata
        )
    
    return {
        **state,
        "summarization": summarization.dict()
    }

