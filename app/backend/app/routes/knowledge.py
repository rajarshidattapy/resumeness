"""Knowledge base routes — POST /knowledge/search."""

from fastapi import APIRouter

from app.schemas import KnowledgeSearchRequest, KnowledgeSearchResponse, KnowledgeItem
from app.services.knowledge_service import KnowledgeService

router = APIRouter()

_service = KnowledgeService()


@router.post("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(request: KnowledgeSearchRequest):
    """Search the knowledge base for relevant items by query similarity."""
    results = _service.search(
        query=request.query,
        top_k=request.top_k,
        types=request.types,
    )
    return KnowledgeSearchResponse(
        results=[KnowledgeItem(**r) for r in results],
        query=request.query,
    )
