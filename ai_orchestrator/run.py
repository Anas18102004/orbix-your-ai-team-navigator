"""Entry point for running the AI orchestrator service."""
import uvicorn
from ai_orchestrator.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "ai_orchestrator.main:app",
        host=settings.ai_service_host,
        port=settings.ai_service_port,
        reload=True
    )

