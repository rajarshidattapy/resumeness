import json
import os
from typing import Dict, List

from openai import AsyncOpenAI

from app.models.quiz import QuizQuestion
from app.utils.logger import logger

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

QUIZ_PROMPT = """Generate a short multiple-choice quiz to verify someone genuinely has the skill/experience described below — not just pasted a keyword.

Skill/experience:
Title: {title}
Type: {type}
Description: {content}
Tags: {tags}

Rules:
- {n} questions, each with exactly 4 options and exactly one correct answer.
- Questions should require understanding, not just recall of the description text (a knowledgeable person should be able to answer without having read this description; someone who fabricated the entry should struggle).
- Keep questions concise and unambiguous.

Return this exact JSON structure:
{{
  "questions": [
    {{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}}
  ]
}}

Return ONLY valid JSON. No markdown code blocks. No explanation outside the JSON."""


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return text.strip()


async def generate_quiz(kb_item: Dict, n: int = 3) -> List[QuizQuestion]:
    prompt = QUIZ_PROMPT.format(
        title=kb_item.get("title", ""),
        type=kb_item.get("type", ""),
        content=kb_item.get("content", ""),
        tags=", ".join(kb_item.get("tags", [])),
        n=n,
    )

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You write concise skill-verification quizzes. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=800,
    )

    raw = _strip_json_fences(response.choices[0].message.content)
    data = json.loads(raw)
    questions = [QuizQuestion(**q) for q in data.get("questions", [])]

    if not questions:
        logger.warning(f"Quiz generation returned no questions for '{kb_item.get('title')}'")

    return questions


def score_quiz(questions: List[QuizQuestion], answers: List[int]) -> tuple[int, int]:
    """Returns (score 0-100, correct_count)."""
    if not questions:
        return 0, 0
    correct = sum(
        1 for q, a in zip(questions, answers) if a == q.correctIndex
    )
    score = round(correct / len(questions) * 100)
    return score, correct
