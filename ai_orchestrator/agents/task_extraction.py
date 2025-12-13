"""Agent 2: Task Extraction Agent."""
import json
from typing import Dict, Any
try:
    from ..models.llm import get_classification_model
    from ..models.schemas import TaskExtractionOutput
    from ..prompts.agent_prompts import TASK_EXTRACTION_PROMPT
except ImportError:
    from models.llm import get_classification_model
    from models.schemas import TaskExtractionOutput
    from prompts.agent_prompts import TASK_EXTRACTION_PROMPT


async def task_extraction_agent(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract structured task information from a message.
    
    Input state keys:
        - cleaned_text: str
        - category: str
        - urgency: str
        - thread_context: str (optional)
    
    Output state keys:
        - task_extraction: TaskExtractionOutput
    """
    llm = get_classification_model()
    
    understanding = state.get("message_understanding", {})
    
    # Prepare prompt
    prompt = TASK_EXTRACTION_PROMPT.format_messages(
        cleaned_text=understanding.get("cleaned_text", state.get("cleaned_text", "")),
        category=understanding.get("category", "other"),
        urgency=understanding.get("urgency_estimate", "low"),
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
        extraction = TaskExtractionOutput(**result_dict)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error parsing task extraction output: {e}")
        # Fallback
        extraction = TaskExtractionOutput(
            title="Untitled Task",
            description=understanding.get("cleaned_text", ""),
            suggested_priority="P2",
            task_type="other"
        )
    
    return {
        **state,
        "task_extraction": extraction.dict()
    }

