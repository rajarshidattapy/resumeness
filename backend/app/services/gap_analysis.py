from typing import Dict, List

from pydantic import BaseModel

from app.services.embedding_service import get_embedding, cosine_similarity
from app.services.extractor import extract_job_requirements
from app.utils.logger import logger

GAP_SIMILARITY_THRESHOLD = 0.75


class GapItem(BaseModel):
    requirement: str
    bestSimilarity: float


async def find_knowledge_gaps(job_description: str, kb_items: List[Dict]) -> "List[GapItem]":
    """
    Requirements from the JD that have no strong match anywhere in the KB
    (checked against every item, not just the top-K used for optimization) —
    i.e. things the résumé currently has no evidence for.
    """
    requirements = await extract_job_requirements(job_description)
    candidates = list({*requirements.get("skills", []), *requirements.get("keywords", [])})

    if not candidates:
        return []

    if not kb_items:
        # No KB at all — every requirement is a gap.
        return [GapItem(requirement=c, bestSimilarity=0.0) for c in candidates]

    try:
        item_embeddings = []
        for item in kb_items:
            if item.get("embedding"):
                item_embeddings.append(item["embedding"])
            else:
                text = f"{item.get('title', '')} {item.get('content', '')} {' '.join(item.get('tags', []))}"
                item_embeddings.append(await get_embedding(text))

        gaps: List[GapItem] = []
        for requirement in candidates:
            req_embedding = await get_embedding(requirement)
            best = max(
                (cosine_similarity(req_embedding, emb) for emb in item_embeddings),
                default=0.0,
            )
            if best < GAP_SIMILARITY_THRESHOLD:
                gaps.append(GapItem(requirement=requirement, bestSimilarity=round(best, 3)))

        gaps.sort(key=lambda g: g.bestSimilarity)
        return gaps
    except Exception as e:
        logger.error(f"Gap analysis error: {e}")
        return []
