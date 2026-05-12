from typing import List, Dict
from app.services.retriever import retrieve_relevant_kb_items


async def rank_kb_items(
    job_description: str,
    kb_items: List[Dict],
    top_k: int = 5,
) -> List[Dict]:
    """Rank KB items by semantic relevance to the job description."""
    return await retrieve_relevant_kb_items(job_description, kb_items, top_k)
