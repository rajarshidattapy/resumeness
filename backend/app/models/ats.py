from pydantic import BaseModel
from typing import List, Optional

from app.services.ats_benchmark.models import BenchmarkResult

class ATSAnalyzeRequest(BaseModel):
    resumeLatex: str
    jobDescription: str
    deep: bool = False

class ATSAnalyzeResponse(BaseModel):
    score: int
    matchedKeywords: List[str]
    missingKeywords: List[str]
    suggestions: List[str]
    benchmark: Optional[BenchmarkResult] = None
