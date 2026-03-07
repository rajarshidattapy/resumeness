"""Knowledge base service — in-memory keyword search.

Can be extended to use pgvector for vector similarity search
when a PostgreSQL database is configured.
"""

from __future__ import annotations

import re


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9#+.]+", text.lower()))


class KnowledgeService:
    """Stateless knowledge base search (items are passed per-request or stored in-memory)."""

    def __init__(self):
        self._items: list[dict] = []

    def set_items(self, items: list[dict]):
        self._items = items

    def search(
        self,
        query: str,
        top_k: int = 5,
        types: list[str] | None = None,
        items: list[dict] | None = None,
    ) -> list[dict]:
        """Keyword-overlap search. Returns top_k items sorted by relevance."""
        pool = items if items is not None else self._items
        if types:
            pool = [i for i in pool if i.get("type") in types]

        query_tokens = _tokenize(query)
        if not query_tokens:
            return pool[:top_k]

        scored = []
        for item in pool:
            item_text = f"{item.get('title', '')} {item.get('content', '')} {' '.join(item.get('tags', []))}"
            item_tokens = _tokenize(item_text)
            overlap = query_tokens & item_tokens
            score = len(overlap) / len(query_tokens)
            if score > 0:
                scored.append((item, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return [item for item, _ in scored[:top_k]]
