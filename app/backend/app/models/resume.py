from pydantic import BaseModel
from typing import List, Optional

class ResumePatch(BaseModel):
    section: str
    target: str
    old: str
    new: str

class OptimizeRequest(BaseModel):
    resumeLatex: str
    jobDescription: str
    knowledgeBaseItems: List[dict]

class OptimizeResponse(BaseModel):
    changes: List[ResumePatch]
    summary: str
    atsScoreBefore: int
    atsScoreAfter: int
