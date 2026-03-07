"""LLM service — factory for LangChain chat model instances."""

from __future__ import annotations

import os

from langchain_core.language_models import BaseChatModel

_cached_llm: BaseChatModel | None = None


def get_llm() -> BaseChatModel:
    """Return a configured LLM instance (cached singleton).

    Uses Ollama by default. Set OPENAI_API_KEY env var to use OpenAI instead.
    """
    global _cached_llm
    if _cached_llm is not None:
        return _cached_llm

    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        from langchain_openai import ChatOpenAI

        _cached_llm = ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            temperature=0.7,
            api_key=openai_key,
        )
    else:
        try:
            from langchain_ollama import ChatOllama
        except ImportError:
            from langchain_community.chat_models import ChatOllama

        _cached_llm = ChatOllama(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            model=os.getenv("OLLAMA_MODEL", "llama3"),
            temperature=0.7,
            num_ctx=4096,
        )

    return _cached_llm
