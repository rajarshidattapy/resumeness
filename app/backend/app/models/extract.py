from pydantic import BaseModel
from typing import List

class ExtractRequest(BaseModel):
    jobDescription: str

class ExtractResponse(BaseModel):
    role: str
    skills: List[str]
    keywords: List[str]
    priority: List[str]
