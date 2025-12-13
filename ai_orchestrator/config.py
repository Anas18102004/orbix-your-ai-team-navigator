"""Configuration management for Orbix AI Orchestrator."""
import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Gemini API
    gemini_api_key: str = Field(default="", env="GEMINI_API_KEY")
    
    # Orbix Backend
    orbix_backend_url: str = Field(
        default="http://localhost:3000",
        env="ORBIX_BACKEND_URL"
    )
    
    # MongoDB for vector search (optional, can use backend's MongoDB)
    mongodb_uri: Optional[str] = Field(default=None, env="MONGODB_URI")
    
    # AI Service Configuration
    ai_service_port: int = Field(default=8000, env="AI_SERVICE_PORT")
    ai_service_host: str = Field(default="0.0.0.0", env="AI_SERVICE_HOST")
    
    # API Authentication (for calling AI service from backend)
    ai_service_api_key: Optional[str] = Field(default=None, env="AI_SERVICE_API_KEY")
    
    # Backend API Authentication (if backend requires API key)
    backend_api_key: Optional[str] = Field(default=None, env="BACKEND_API_KEY")
    
    # Model Configuration
    gemini_model: str = Field(default="gemini-pro", env="GEMINI_MODEL")
    gemini_temperature: float = Field(default=0.7, env="GEMINI_TEMPERATURE")
    
    # RAG Configuration
    vector_search_collection: str = Field(
        default="workspace_contexts",
        env="VECTOR_SEARCH_COLLECTION"
    )
    vector_search_top_k: int = Field(default=5, env="VECTOR_SEARCH_TOP_K")
    
    # Mode thresholds
    semi_auto_confidence_threshold: float = Field(default=0.75, env="SEMI_AUTO_CONFIDENCE_THRESHOLD")
    full_auto_confidence_threshold: float = Field(default=0.6, env="FULL_AUTO_CONFIDENCE_THRESHOLD")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields in .env that aren't in the model


# Global settings instance
settings = Settings()

