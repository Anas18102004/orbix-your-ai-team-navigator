"""LangChain Gemini model wrappers."""
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models.chat_models import BaseChatModel
try:
    from ..config import settings
except ImportError:
    from config import settings


def get_chat_model(
    temperature: Optional[float] = None,
    model_name: Optional[str] = None
) -> BaseChatModel:
    """
    Get a Gemini chat model instance.
    
    Args:
        temperature: Model temperature (defaults to config)
        model_name: Model name (defaults to config)
    
    Returns:
        ChatGoogleGenerativeAI instance
    """
    return ChatGoogleGenerativeAI(
        model=model_name or settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=temperature or settings.gemini_temperature,
    )


def get_classification_model() -> BaseChatModel:
    """
    Get a model optimized for classification tasks (lower temperature).
    
    Returns:
        ChatGoogleGenerativeAI instance with lower temperature
    """
    return get_chat_model(temperature=0.3)


def get_reasoning_model() -> BaseChatModel:
    """
    Get a model optimized for reasoning tasks (higher temperature).
    
    Returns:
        ChatGoogleGenerativeAI instance with higher temperature
    """
    return get_chat_model(temperature=0.8)


def get_chat_model_for_conversation() -> BaseChatModel:
    """
    Get a model optimized for conversational tasks.
    
    Returns:
        ChatGoogleGenerativeAI instance with balanced temperature
    """
    return get_chat_model(temperature=0.7)

