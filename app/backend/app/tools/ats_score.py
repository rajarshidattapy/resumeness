"""Tool 4 — ATS Score Calculator.

Deterministic ATS compatibility scoring based on keyword coverage,
formatting structure, experience relevance, and skill match.
"""

from __future__ import annotations

import re


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9#+.]+", text.lower()))


def _extract_keywords_from_jd(jd: str) -> list[str]:
    """Extract likely ATS keywords from a job description."""
    # Common noise words to skip
    stopwords = {
        "the", "a", "an", "and", "or", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "shall", "can", "to", "of", "in",
        "for", "on", "with", "at", "by", "from", "as", "into", "through",
        "during", "before", "after", "above", "below", "between", "out", "off",
        "over", "under", "again", "further", "then", "once", "here", "there",
        "when", "where", "why", "how", "all", "each", "every", "both", "few",
        "more", "most", "other", "some", "such", "no", "nor", "not", "only",
        "own", "same", "so", "than", "too", "very", "just", "about", "up",
        "we", "our", "you", "your", "they", "their", "this", "that", "these",
        "those", "it", "its", "i", "me", "my", "he", "she", "him", "her",
        "who", "what", "which", "if", "but", "because", "while", "also",
        "within", "across", "including", "using", "work", "working", "team",
        "role", "position", "company", "looking", "seeking", "join", "ability",
        "strong", "experience", "years", "required", "preferred", "must",
    }

    tokens = re.findall(r"[a-z0-9#+.]+", jd.lower())
    # Keep tokens ≥ 2 chars that aren't stopwords
    keywords = [t for t in tokens if len(t) >= 2 and t not in stopwords]

    # Also extract multi-word phrases (2-3 words) that appear interesting
    phrases = re.findall(
        r"\b(?:machine learning|deep learning|natural language processing|"
        r"ci/cd|ci cd|rest api|restful api|graphql|data science|data engineering|"
        r"full stack|front end|back end|cloud computing|project management|"
        r"react native|node\.?js|next\.?js|vue\.?js|angular\.?js|"
        r"amazon web services|google cloud|microsoft azure|"
        r"problem solving|communication skills|team leadership)\b",
        jd.lower(),
    )
    keywords.extend(phrases)

    # Deduplicate while preserving order
    seen = set()
    unique = []
    for kw in keywords:
        if kw not in seen:
            seen.add(kw)
            unique.append(kw)
    return unique


class ATSScoreCalculator:
    """Deterministic ATS scoring engine."""

    def calculate(self, resume_latex: str, job_description: str) -> dict:
        jd_keywords = _extract_keywords_from_jd(job_description)
        resume_tokens = _tokenize(resume_latex)

        # 1. Keyword coverage (50% weight)
        matched = [kw for kw in jd_keywords if kw in resume_tokens]
        missing = [kw for kw in jd_keywords if kw not in resume_tokens]
        keyword_coverage = len(matched) / max(len(jd_keywords), 1)

        # 2. Formatting structure score (20% weight)
        formatting_score = self._score_formatting(resume_latex)

        # 3. Section completeness (15% weight)
        section_score = self._score_sections(resume_latex)

        # 4. Action verb / quantification density (15% weight)
        impact_score = self._score_impact_language(resume_latex)

        # Weighted total
        total = (
            keyword_coverage * 50
            + formatting_score * 20
            + section_score * 15
            + impact_score * 15
        )
        total = min(100, max(0, int(total)))

        suggestions = self._generate_suggestions(
            keyword_coverage, formatting_score, section_score, impact_score, missing
        )

        return {
            "score": total,
            "keyword_match": round(keyword_coverage * 100, 1),
            "matched_keywords": matched[:30],
            "missing_keywords": missing[:20],
            "suggestions": suggestions,
        }

    # ── component scorers ───────────────────────────────────────────────

    def _score_formatting(self, latex: str) -> float:
        score = 0.0
        if "\\documentclass" in latex:
            score += 0.2
        if "\\section" in latex:
            score += 0.25
        if "\\begin{itemize}" in latex:
            score += 0.2
        if "\\textbf" in latex:
            score += 0.15
        if "\\hfill" in latex:
            score += 0.1
        if "\\item" in latex:
            score += 0.1
        return min(1.0, score)

    def _score_sections(self, latex: str) -> float:
        important_sections = [
            "experience", "education", "skills", "summary", "projects",
        ]
        found = sum(
            1 for s in important_sections
            if re.search(rf"\\section\*?\{{[^}}]*{s}[^}}]*\}}", latex, re.IGNORECASE)
        )
        return found / len(important_sections)

    def _score_impact_language(self, latex: str) -> float:
        action_verbs = [
            "led", "built", "developed", "implemented", "designed", "created",
            "achieved", "improved", "reduced", "increased", "managed", "delivered",
            "optimized", "launched", "architected", "mentored", "spearheaded",
        ]
        lower = latex.lower()
        verb_count = sum(1 for v in action_verbs if v in lower)

        # Check for numbers / percentages (quantified achievements)
        numbers = len(re.findall(r"\d+[%+]?", latex))

        verb_score = min(1.0, verb_count / 8)
        number_score = min(1.0, numbers / 10)
        return (verb_score + number_score) / 2

    # ── suggestions ─────────────────────────────────────────────────────

    def _generate_suggestions(
        self,
        keyword_cov: float,
        fmt_score: float,
        sec_score: float,
        impact_score: float,
        missing: list[str],
    ) -> list[str]:
        suggestions: list[str] = []
        if keyword_cov < 0.5:
            top_missing = ", ".join(missing[:8])
            suggestions.append(
                f"Add missing keywords to improve ATS match: {top_missing}"
            )
        if fmt_score < 0.7:
            suggestions.append(
                "Improve formatting: use clear section headers, bullet points, and consistent structure"
            )
        if sec_score < 0.6:
            suggestions.append(
                "Add important resume sections like Experience, Education, Skills, and Projects"
            )
        if impact_score < 0.5:
            suggestions.append(
                "Use stronger action verbs and quantify achievements with numbers and percentages"
            )
        if not suggestions:
            suggestions.append("Resume is well-optimized! Minor tweaks may still help.")
        return suggestions
