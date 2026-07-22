from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class QuizQuestion(BaseModel):
    question: str
    options: List[str] = Field(min_length=4, max_length=4)
    correctIndex: int = Field(ge=0, le=3)


class QuizAttempt(BaseModel):
    id: str
    userId: str
    kbItemId: str
    questions: List[QuizQuestion]
    answers: List[int]
    score: int  # 0-100
    timestamp: datetime


class QuizSubmitRequest(BaseModel):
    questions: List[QuizQuestion]
    answers: List[int]


class QuizSubmitResponse(BaseModel):
    score: int
    correctCount: int
    total: int
    certificateId: Optional[str] = None
