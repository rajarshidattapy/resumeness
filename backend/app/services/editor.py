import re
from openai import AsyncOpenAI
import os
from typing import Dict
from app.utils.logger import logger

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_EDIT_VERBS = re.compile(
    r'\b(change|update|replace|rename|fix|correct|modify|edit|rewrite|rephrase|reword|'
    r'add|include|insert|append|'
    r'remove|delete|drop|eliminate|'
    r'move|reorder|swap|make|set|use|put)\b',
    re.IGNORECASE,
)

EDIT_PROMPT = """You are a precise LaTeX resume editor.

Edit instruction: {instruction}

Current resume (LaTeX):
{resume_latex}

Rules:
1. Apply ONLY the requested change — nothing more, nothing less
2. Preserve ALL LaTeX commands, formatting, and structure exactly as-is
3. Do NOT rephrase, improve, or rewrite anything that was not asked
4. If the requested text does not exist, return the original unchanged
5. Return ONLY the complete updated LaTeX document — no explanation, no markdown fences

Updated LaTeX:"""


def is_edit_command(text: str) -> bool:
    """
    Heuristic: message is a direct editing instruction if it is short
    and contains at least one imperative edit verb.
    """
    stripped = text.strip()
    if len(stripped) > 300:
        return False
    return bool(_EDIT_VERBS.search(stripped))


def _strip_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = len(lines) - 1 if lines[-1].strip().startswith("```") else len(lines)
        text = "\n".join(lines[1:end]).strip()
    return text


async def apply_direct_edit(resume_latex: str, instruction: str) -> Dict:
    """
    Ask the LLM to apply a targeted edit instruction to the resume LaTeX.
    Returns {"updatedLatex": str, "success": bool}.
    """
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a precise LaTeX resume editor. "
                        "Apply only the requested change. "
                        "Return only the complete updated LaTeX document — no markdown, no explanation."
                    ),
                },
                {
                    "role": "user",
                    "content": EDIT_PROMPT.format(
                        instruction=instruction,
                        resume_latex=resume_latex,
                    ),
                },
            ],
            temperature=0.05,
            max_tokens=4000,
        )

        updated = _strip_fences(response.choices[0].message.content)

        if not updated or len(updated) < 50:
            logger.warning("Direct edit returned empty result; keeping original")
            return {"updatedLatex": resume_latex, "success": False}

        changed = updated != resume_latex
        logger.info(f"Direct edit: '{instruction[:60]}' — changed={changed}")
        return {"updatedLatex": updated, "success": changed}

    except Exception as e:
        logger.error(f"Direct edit error: {e}")
        return {"updatedLatex": resume_latex, "success": False}
