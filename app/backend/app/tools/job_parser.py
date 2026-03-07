"""Tool 1 — Job Description Analyzer.

Extracts structured information from job descriptions using the LLM.
"""

from __future__ import annotations

import json
import re

from langchain_core.tools import tool

from app.services.llm_service import get_llm

JD_ANALYSIS_PROMPT = """Analyze the following job description and extract structured information.
Return ONLY valid JSON (no markdown fences) with these exact keys:

{{
  "role_title": "exact job title",
  "seniority": "one of: junior, mid, senior, lead, principal, staff, manager, director",
  "required_skills": ["list of required technical skills"],
  "optional_skills": ["list of nice-to-have / preferred skills"],
  "keywords": ["important ATS keywords and phrases from the JD"],
  "industry": "industry or domain"
}}

Job Description:
{job_description}
"""


def _parse_json_response(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown fences."""
    # Strip markdown code fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned)
    cleaned = cleaned.strip()

    # Try parsing directly
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try extracting first JSON object
    match = re.search(r"\{[\s\S]*\}", cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Return a safe fallback
    return {
        "role_title": "Unknown",
        "seniority": "mid",
        "required_skills": [],
        "optional_skills": [],
        "keywords": [],
        "industry": "Unknown",
    }


class JobDescriptionAnalyzer:
    """Analyze a job description and extract structured data."""

    async def analyze(self, job_description: str) -> dict:
        llm = get_llm()
        prompt = JD_ANALYSIS_PROMPT.format(job_description=job_description)
        response = await llm.ainvoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        text = content if isinstance(content, str) else str(content)
        return _parse_json_response(text)


@tool
def analyze_job_description(job_description: str) -> str:
    """Analyze a job description to extract role title, skills, keywords, seniority and industry.
    Returns structured JSON with: role_title, seniority, required_skills, optional_skills, keywords, industry.
    """
    import asyncio

    analyzer = JobDescriptionAnalyzer()
    result = asyncio.get_event_loop().run_until_complete(
        analyzer.analyze(job_description)
    )
    return json.dumps(result, indent=2)
