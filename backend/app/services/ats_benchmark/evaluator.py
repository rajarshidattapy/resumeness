import json
import os

from openai import AsyncOpenAI

from app.services.ats_analyzer import extract_text_from_latex
from app.services.ats_benchmark.models import BenchmarkResult
from app.services.ats_benchmark.template_manager import render_template
from app.utils.logger import logger

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
    return text.strip()


async def evaluate_against_jd(resume_latex: str, job_description: str) -> BenchmarkResult | None:
    """
    LLM-judged, JD-aware résumé benchmark — structured scoring across four
    categories, each with cited evidence. Returns None on failure (caller
    treats this as "benchmark unavailable", not a hard error).
    """
    resume_text = extract_text_from_latex(resume_latex)

    system_prompt = render_template("benchmark_system.jinja")
    user_prompt = render_template(
        "benchmark_criteria.jinja",
        job_description=job_description,
        resume_text=resume_text,
    )

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1200,
        )
        raw = _strip_json_fences(response.choices[0].message.content)
        data = json.loads(raw)
        return BenchmarkResult(**data)
    except Exception as e:
        logger.error(f"ATS benchmark evaluation failed: {e}")
        return None
