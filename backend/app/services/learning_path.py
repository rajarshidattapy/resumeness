import json
import os
from typing import Dict, List, Optional

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.utils.logger import logger

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Small, deliberately curated set of vetted sources per category — not a
# search index. Keeps recommendations credible (official docs / well-known
# courses only) without needing an open-ended search agent.
VETTED_SOURCES: Dict[str, List[Dict[str, str]]] = {
    "python": [
        {"name": "The Official Python Tutorial", "url": "https://docs.python.org/3/tutorial/"},
        {"name": "Real Python", "url": "https://realpython.com/"},
    ],
    "javascript": [
        {"name": "MDN JavaScript Guide", "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"},
        {"name": "javascript.info", "url": "https://javascript.info/"},
    ],
    "react": [
        {"name": "React Official Docs", "url": "https://react.dev/learn"},
    ],
    "aws": [
        {"name": "AWS Skill Builder (free tier)", "url": "https://skillbuilder.aws/"},
        {"name": "AWS Documentation", "url": "https://docs.aws.amazon.com/"},
    ],
    "docker": [
        {"name": "Docker Official Get Started Guide", "url": "https://docs.docker.com/get-started/"},
    ],
    "kubernetes": [
        {"name": "Kubernetes Official Tutorials", "url": "https://kubernetes.io/docs/tutorials/"},
    ],
    "sql": [
        {"name": "Mode SQL Tutorial", "url": "https://mode.com/sql-tutorial/"},
        {"name": "PostgreSQL Official Tutorial", "url": "https://www.postgresql.org/docs/current/tutorial.html"},
    ],
    "machine learning": [
        {"name": "Google Machine Learning Crash Course", "url": "https://developers.google.com/machine-learning/crash-course"},
    ],
    "git": [
        {"name": "Official Git Book", "url": "https://git-scm.com/book/en/v2"},
    ],
    "default": [
        {"name": "freeCodeCamp", "url": "https://www.freecodecamp.org/"},
    ],
}


class LearningSource(BaseModel):
    name: str
    url: str


class LearningPathResult(BaseModel):
    title: str
    sources: List[LearningSource]
    estimatedHours: int
    blurb: str


def _match_sources(requirement: str) -> List[Dict[str, str]]:
    req_lower = requirement.lower()
    for key, sources in VETTED_SOURCES.items():
        if key != "default" and key in req_lower:
            return sources
    return VETTED_SOURCES["default"]


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return text.strip()


async def suggest_learning_path(requirement: str) -> Optional[LearningPathResult]:
    sources = _match_sources(requirement)
    source_list = "\n".join(f"- {s['name']}: {s['url']}" for s in sources)

    prompt = f"""A job requires "{requirement}" and the candidate has no evidence of it yet.

Available vetted sources (do not suggest anything outside this list):
{source_list}

Write a short (1-2 sentence) blurb on how to use these sources to build a credible ~6 hour crash-course understanding of "{requirement}", and estimate realistic hours (typically 4-8).

Return this exact JSON structure:
{{"blurb": "...", "estimatedHours": 6}}

Return ONLY valid JSON."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You write concise, honest learning-path summaries. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=200,
        )
        raw = _strip_json_fences(response.choices[0].message.content)
        data = json.loads(raw)
        return LearningPathResult(
            title=f"Learning path: {requirement}",
            sources=[LearningSource(**s) for s in sources],
            estimatedHours=data.get("estimatedHours", 6),
            blurb=data.get("blurb", ""),
        )
    except Exception as e:
        logger.error(f"Learning path suggestion failed: {e}")
        # Degrade gracefully: still return the curated sources without the
        # LLM-written blurb, since those are the credible part.
        return LearningPathResult(
            title=f"Learning path: {requirement}",
            sources=[LearningSource(**s) for s in sources],
            estimatedHours=6,
            blurb=f"Start with the sources below to build working knowledge of {requirement}.",
        )
