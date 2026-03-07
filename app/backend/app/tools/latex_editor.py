"""Tool 3 — LaTeX Resume Editor.

Modify LaTeX resume content without breaking formatting.
"""

from __future__ import annotations

import json
import re

from langchain_core.tools import tool

from app.services.llm_service import get_llm

REWRITE_PROMPT = """You are a professional resume writer and LaTeX expert.

You must rewrite the LaTeX resume to be optimized for the following job description.

RULES:
1. ONLY modify bullet points, section content, and professional summary.
2. DO NOT change the LaTeX document structure, \\documentclass, preamble, or formatting commands.
3. Naturally incorporate these keywords: {keywords}
4. Use relevant items from the knowledge base below.
5. Keep all LaTeX syntax valid — ensure every \\begin has a matching \\end, braces are balanced.
6. Use strong action verbs and quantified achievements.
7. Return ONLY the complete LaTeX document — no explanations, no markdown fences.

KNOWLEDGE BASE (relevant experience):
{knowledge_items}

JOB DESCRIPTION:
{job_description}

CURRENT RESUME LATEX:
{resume_latex}

Return the updated LaTeX document:"""


class LaTeXResumeEditor:
    """Edit LaTeX resumes using LLM while preserving structure."""

    async def rewrite(
        self,
        resume_latex: str,
        job_description: str,
        keywords: list[str],
        knowledge_items: list[dict],
    ) -> str:
        llm = get_llm()

        kb_text = "\n".join(
            f"- [{item.get('type', 'item')}] {item.get('title', '')}: {item.get('content', '')}"
            for item in knowledge_items
        )

        prompt = REWRITE_PROMPT.format(
            keywords=", ".join(keywords),
            knowledge_items=kb_text or "(none)",
            job_description=job_description,
            resume_latex=resume_latex,
        )

        response = await llm.ainvoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        text: str = content if isinstance(content, str) else str(content)

        # Strip markdown fences if present
        text = re.sub(r"^```(?:latex|tex)?\s*\n?", "", text, flags=re.MULTILINE)
        text = re.sub(r"\n?```\s*$", "", text, flags=re.MULTILINE)

        # Validate basic LaTeX structure
        if "\\documentclass" not in text or "\\begin{document}" not in text:
            # LLM returned something invalid — return original
            return resume_latex

        return text.strip()

    def extract_changes(self, original: str, updated: str) -> list[dict]:
        """Identify which sections were changed."""
        changes = []
        # Extract sections from both
        section_re = r"\\section\*?\{([^}]+)\}"
        orig_sections = dict(re.findall(r"(\\section\*?\{[^}]+\})([\s\S]*?)(?=\\section|\\end\{document\})", original))
        new_sections = dict(re.findall(r"(\\section\*?\{[^}]+\})([\s\S]*?)(?=\\section|\\end\{document\})", updated))

        for header, content in new_sections.items():
            orig_content = orig_sections.get(header, "")
            if content.strip() != orig_content.strip():
                # extract name from header
                match = re.search(r"\{([^}]+)\}", header)
                name = match.group(1) if match else header
                changes.append({
                    "section": name,
                    "description": f"Updated {name} section with job-aligned content",
                })

        if not changes:
            changes.append({
                "section": "General",
                "description": "Minor content adjustments throughout the resume",
            })
        return changes


@tool
def edit_latex_resume(
    resume_latex: str,
    job_description: str,
    keywords: str,
    knowledge_items_json: str,
) -> str:
    """Rewrite a LaTeX resume to be optimized for a specific job description.
    Incorporates relevant keywords and knowledge base items while preserving LaTeX structure.

    Args:
        resume_latex: The current LaTeX resume content
        job_description: The target job description
        keywords: Comma-separated ATS keywords to incorporate
        knowledge_items_json: JSON string of relevant knowledge base items
    """
    import asyncio

    try:
        knowledge_items = json.loads(knowledge_items_json)
    except json.JSONDecodeError:
        knowledge_items = []

    keyword_list = [k.strip() for k in keywords.split(",") if k.strip()]

    editor = LaTeXResumeEditor()
    result = asyncio.get_event_loop().run_until_complete(
        editor.rewrite(resume_latex, job_description, keyword_list, knowledge_items)
    )
    return result
