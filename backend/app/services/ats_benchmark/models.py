from typing import List
from pydantic import BaseModel, Field


class CategoryScore(BaseModel):
    score: float = Field(ge=0)
    max: int = Field(gt=0)
    evidence: str


class BenchmarkResult(BaseModel):
    skills_alignment: CategoryScore
    experience_relevance: CategoryScore
    project_relevance: CategoryScore
    ats_readability: CategoryScore
    key_strengths: List[str]
    areas_for_improvement: List[str]
    overall: int = Field(ge=0, le=100)
