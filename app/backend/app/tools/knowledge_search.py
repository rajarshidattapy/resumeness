"""Tool 2 — Knowledge Base Search.

Search knowledge base items by keyword/semantic relevance.
"""

from __future__ import annotations

import json
import re

from langchain_core.tools import tool


def _tokenize(text: str) -> set[str]:
    """Lowercase token set from text."""
    return set(re.findall(r"[a-z0-9#+.]+", text.lower()))


def _relevance_score(item: dict, query_tokens: set[str]) -> float:
    """Compute a simple keyword-overlap relevance score."""
    item_tokens = _tokenize(
        f"{item.get('title', '')} {item.get('content', '')} {' '.join(item.get('tags', []))}"
    )
    if not query_tokens:
        return 0.0
    overlap = query_tokens & item_tokens
    # Jaccard-like: overlap / query_tokens size  (so smaller queries aren't penalised)
    return len(overlap) / len(query_tokens)


class KnowledgeBaseSearch:
    """In-memory keyword search over knowledge items."""

    def search(
        self,
        query: str,
        knowledge_base: list[dict],
        top_k: int = 5,
        types: list[str] | None = None,
    ) -> list[dict]:
        query_tokens = _tokenize(query)
        candidates = knowledge_base
        if types:
            candidates = [kb for kb in candidates if kb.get("type") in types]

        scored = [(item, _relevance_score(item, query_tokens)) for item in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [item for item, score in scored[:top_k] if score > 0]


@tool
def search_knowledge_base(query: str, knowledge_base_json: str) -> str:
    """Search the user's knowledge base for projects, skills, experience, and achievements
    relevant to the given query. Returns top matching items as JSON.

    Args:
        query: search terms (skills, technologies, keywords from job description)
        knowledge_base_json: JSON string of knowledge base items
    """
    try:
        kb = json.loads(knowledge_base_json)
    except json.JSONDecodeError:
        kb = []

    searcher = KnowledgeBaseSearch()
    results = searcher.search(query, kb, top_k=5)
    return json.dumps(results, indent=2)
