"""Resume Optimization Agent — LangChain tool-calling agent.

Orchestrates the 6-step resume optimization pipeline:
1. Analyze Job Description
2. Retrieve relevant experience
3. Modify LaTeX resume
4. Calculate ATS score
5. Self-check for improvements
6. Return results
"""

from __future__ import annotations

import json
import logging

from app.services.llm_service import get_llm
from app.services.knowledge_service import KnowledgeService
from app.tools.ats_score import ATSScoreCalculator
from app.tools.job_parser import JobDescriptionAnalyzer
from app.tools.latex_editor import LaTeXResumeEditor

logger = logging.getLogger(__name__)


class ResumeOptimizationAgent:
    """Main agent that orchestrates resume optimization using a sequential tool-calling pipeline."""

    def __init__(self):
        self.jd_analyzer = JobDescriptionAnalyzer()
        self.kb_search = KnowledgeService()
        self.latex_editor = LaTeXResumeEditor()
        self.ats_calculator = ATSScoreCalculator()

    async def run(
        self,
        job_description: str,
        resume_latex: str,
        knowledge_base: list[dict],
    ) -> dict:
        """Execute the full optimization pipeline.

        Returns dict with:
            updated_resume_latex, ats_score_before, ats_score_after,
            changes_summary, changes, success
        """
        logger.info("Step 1/5: Analyzing job description...")
        jd_analysis = await self.jd_analyzer.analyze(job_description)
        keywords = jd_analysis.get("keywords", [])
        required_skills = jd_analysis.get("required_skills", [])
        optional_skills = jd_analysis.get("optional_skills", [])
        all_query_terms = keywords + required_skills + optional_skills

        logger.info("Step 2/5: Searching knowledge base...")
        relevant_items = self.kb_search.search(
            query=" ".join(all_query_terms),
            items=knowledge_base,
            top_k=5,
        )

        logger.info("Step 3/5: Computing initial ATS score...")
        ats_before = self.ats_calculator.calculate(resume_latex, job_description)
        score_before = ats_before["score"]

        logger.info("Step 4/5: Rewriting LaTeX resume...")
        updated_latex = await self.latex_editor.rewrite(
            resume_latex=resume_latex,
            job_description=job_description,
            keywords=keywords,
            knowledge_items=relevant_items,
        )

        logger.info("Step 5/5: Computing final ATS score & generating changes...")
        ats_after = self.ats_calculator.calculate(updated_latex, job_description)
        score_after = ats_after["score"]

        # Detect what changed
        changes = self.latex_editor.extract_changes(resume_latex, updated_latex)

        # If score didn't improve, try one more optimization pass
        if score_after <= score_before and updated_latex != resume_latex:
            logger.info("Score did not improve — running second optimization pass...")
            missing_kw = ats_after.get("missing_keywords", [])[:10]
            extra_keywords = keywords + missing_kw

            updated_latex_v2 = await self.latex_editor.rewrite(
                resume_latex=updated_latex,
                job_description=job_description,
                keywords=extra_keywords,
                knowledge_items=relevant_items,
            )

            ats_v2 = self.ats_calculator.calculate(updated_latex_v2, job_description)
            if ats_v2["score"] > score_after:
                updated_latex = updated_latex_v2
                ats_after = ats_v2
                score_after = ats_v2["score"]
                changes = self.latex_editor.extract_changes(resume_latex, updated_latex)

        changes_summary = [c["description"] for c in changes]
        changes_summary.append(
            f"ATS score: {score_before}% → {score_after}% "
            f"({'improved' if score_after > score_before else 'unchanged'})"
        )
        if ats_after.get("suggestions"):
            changes_summary.extend(
                [f"Suggestion: {s}" for s in ats_after["suggestions"][:3]]
            )

        return {
            "updated_resume_latex": updated_latex,
            "ats_score_before": score_before,
            "ats_score_after": score_after,
            "changes_summary": changes_summary,
            "changes": changes,
            "success": True,
        }
