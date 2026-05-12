from openai import AsyncOpenAI
import os
import json
from pathlib import Path
from typing import List, Dict
from app.utils.logger import logger
from app.services.latex_patch import extract_resume_bullets, apply_patches

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "optimize.txt"
OPTIMIZE_PROMPT = _PROMPT_PATH.read_text(encoding="utf-8") if _PROMPT_PATH.exists() else ""


def _format_bullets(bullets: List[Dict[str, str]]) -> str:
    """Number bullets 1..N so AI references them by index, avoiding text-matching issues."""
    lines = []
    current_section = None
    for i, b in enumerate(bullets):
        if b["section"] != current_section:
            current_section = b["section"]
            lines.append(f"\n[{current_section}]")
        lines.append(f"{i + 1}. {b['display']}")
    return "\n".join(lines).strip()


def _format_kb_items(items: List[Dict]) -> str:
    parts = []
    for item in items:
        tags = ", ".join(item.get("tags", []))
        parts.append(
            f"• {item['title']} ({item['type']}): {item['content'][:200]} [tags: {tags}]"
        )
    return "\n".join(parts) or "No knowledge base items provided."


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return text.strip()


async def optimize_resume(
    resume_latex: str,
    job_description: str,
    relevant_kb_items: List[Dict],
) -> Dict:
    """
    Generate structured resume improvements and apply them to the LaTeX.

    Returns:
        {
            "improvements": [...],
            "patches": [...],
            "summary": str,
            "updatedLatex": str,
            "appliedCount": int,
        }
    """
    try:
        bullets = extract_resume_bullets(resume_latex)
        if not bullets:
            logger.warning("No bullets extracted from resume LaTeX")
            return {
                "improvements": [],
                "patches": [],
                "summary": "Could not extract resume bullets for optimization.",
                "updatedLatex": resume_latex,
                "appliedCount": 0,
            }

        bullets_text = _format_bullets(bullets[:30])
        kb_text = _format_kb_items(relevant_kb_items)

        prompt = OPTIMIZE_PROMPT.format(
            job_description=job_description,
            bullets=bullets_text,
            kb_items=kb_text,
        )

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional resume optimizer. Return only valid JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.35,
            max_tokens=2000,
        )

        raw = _strip_json_fences(response.choices[0].message.content)
        result = json.loads(raw)

        improvements = result.get("improvements", [])
        summary = result.get("summary", "Resume optimized for the target role.")
        logger.info(f"Optimizer returned {len(improvements)} improvements")

        patches = []
        for imp in improvements:
            # AI references bullets by 1-based index — exact, no text-matching needed
            idx = imp.get("bulletIndex", 0)
            if not isinstance(idx, int) or idx < 1 or idx > len(bullets):
                logger.warning(f"Invalid bulletIndex {idx}, skipping")
                continue

            bullet = bullets[idx - 1]
            improved_text = imp.get("improved", "").strip()
            if not improved_text:
                continue

            patches.append({
                "section": imp.get("section", bullet["section"]),
                "old": bullet["raw"],
                "new": improved_text,
                "reason": imp.get("reason", ""),
            })

        updated_latex, applied_count = apply_patches(resume_latex, patches)

        logger.info(f"Applied {applied_count}/{len(patches)} patches")

        return {
            "improvements": improvements,
            "patches": patches,
            "summary": summary,
            "updatedLatex": updated_latex,
            "appliedCount": applied_count,
        }

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error in optimizer: {e}")
        return {
            "improvements": [],
            "patches": [],
            "summary": "Optimization failed: invalid AI response.",
            "updatedLatex": resume_latex,
            "appliedCount": 0,
        }
    except Exception as e:
        logger.error(f"Optimizer error: {e}")
        return {
            "improvements": [],
            "patches": [],
            "summary": "Optimization failed. Please try again.",
            "updatedLatex": resume_latex,
            "appliedCount": 0,
        }
