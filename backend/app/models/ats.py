from pydantic import BaseModel
from typing import List

class ATSAnalyzeRequest(BaseModel):
    resumeLatex: str
    jobDescription: str

class ATSAnalyzeResponse(BaseModel):
    score: int
    matchedKeywords: List[str]
    missingKeywords: List[str]
    suggestions: List[str]
