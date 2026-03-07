"""Route registration."""

from app.routes.agent import router as agent_router
from app.routes.knowledge import router as knowledge_router
from app.routes.resume import router as resume_router

__all__ = ["agent_router", "knowledge_router", "resume_router"]
