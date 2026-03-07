"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# ── Knowledge Base ──────────────────────────────────────────────────────────


class KnowledgeItem(BaseModel):
    id: str
    type: str = Field(..., pattern=r"^(project|skill|experience|achievement)$")
    title: str
    content: str
    tags: list[str] = []


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=20)
    types: list[str] | None = None


class KnowledgeSearchResponse(BaseModel):
    results: list[KnowledgeItem]
    query: str


# ── Agent ───────────────────────────────────────────────────────────────────


class AgentRunRequest(BaseModel):
    job_description: str = Field(..., min_length=10)
    resume_latex: str = Field(..., min_length=10)
    knowledge_base: list[KnowledgeItem] = []


class ChangeDetail(BaseModel):
    section: str
    description: str


class AgentRunResponse(BaseModel):
    updated_resume_latex: str
    ats_score_before: int
    ats_score_after: int
    changes_summary: list[str]
    changes: list[ChangeDetail] = []
    execution_time_ms: int
    success: bool


class JobAnalysisResponse(BaseModel):
    role_title: str
    seniority: str
    required_skills: list[str]
    optional_skills: list[str]
    keywords: list[str]
    industry: str


# ── Resume ──────────────────────────────────────────────────────────────────


class ResumeCompileRequest(BaseModel):
    latex_content: str = Field(..., min_length=10)


class ResumeCompileResponse(BaseModel):
    success: bool
    pdf_base64: str | None = None
    error: str | None = None


class ATSScoreRequest(BaseModel):
    resume_latex: str = Field(..., min_length=10)
    job_description: str = Field(..., min_length=10)


class ATSScoreResponse(BaseModel):
    score: int
    keyword_match: float
    matched_keywords: list[str]
    missing_keywords: list[str]
    suggestions: list[str]
