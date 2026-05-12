from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class KnowledgeItem(BaseModel):
    id: str
    type: Literal["project", "skill", "experience", "achievement"]
    title: str
    content: str
    tags: List[str]
    embedding: Optional[List[float]] = None

class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
