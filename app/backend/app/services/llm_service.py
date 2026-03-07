"""LLM service — factory for LangChain chat model instances."""

from __future__ import annotations

import os

from langchain_core.language_models import BaseChatModel

_cached_llm: BaseChatModel | None = None


def get_llm() -> BaseChatModel:
    """Return a configured ChatOpenAI instance (cached singleton).

    Requires OPENAI_API_KEY to be set in the environment.
    """
    global _cached_llm
    if _cached_llm is not None:
        return _cached_llm

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set. "
            "Add it to backend/.env or export it as an environment variable."
        )

    from langchain_openai import ChatOpenAI

    _cached_llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.7,
        api_key=openai_key,
    )

    return _cached_llm
