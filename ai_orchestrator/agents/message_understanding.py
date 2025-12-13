"""Agent 1: Message Understanding Agent."""
import json
from typing import Dict, Any
try:
    from ..models.llm import get_classification_model
    from ..models.schemas import MessageUnderstandingOutput
    from ..prompts.agent_prompts import MESSAGE_UNDERSTANDING_PROMPT
except ImportError:
    from models.llm import get_classification_model
    from models.schemas import MessageUnderstandingOutput
    from prompts.agent_prompts import MESSAGE_UNDERSTANDING_PROMPT


async def message_understanding_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classify a message and determine if it's a task candidate.
    
    Input state keys:
        - message_text: str
        - sender_name: str (optional)
        - channel_name: str (optional)
        - thread_context: str (optional)
    
    Output state keys:
        - message_understanding: MessageUnderstandingOutput
    """
    llm = get_classification_model()
    
    # Prepare prompt
    prompt = MESSAGE_UNDERSTANDING_PROMPT.format_messages(
        message_text=state.get("message_text", ""),
        sender_name=state.get("sender_name", "Unknown"),
        channel_name=state.get("channel_name", "Unknown"),
        thread_context=state.get("thread_context", "None")
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
        understanding = MessageUnderstandingOutput(**result_dict)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing message understanding output: {e}")
        # Fallback to default
        understanding = MessageUnderstandingOutput(
            is_task_candidate=False,
            category="other",
            urgency_estimate="low",
            cleaned_text=state.get("message_text", ""),
            confidence=0.0
        )
    
    return {
        **state,
        "message_understanding": understanding.dict()
    }

