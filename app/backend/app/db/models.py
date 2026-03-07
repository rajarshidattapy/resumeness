"""SQLAlchemy models for optional PostgreSQL persistence.

Only used when DATABASE_URL is configured. The application works
without a database by receiving knowledge base items from the frontend.
"""

from __future__ import annotations

import os
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


class KnowledgeItemModel(Base):
    __tablename__ = "knowledge_items"

    id = Column(String, primary_key=True)
    type = Column(String(50), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    tags = Column(ARRAY(String), default=[])
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResumeVersionModel(Base):
    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=True)
    latex_content = Column(Text, nullable=False)
    ats_score = Column(Integer, nullable=True)
    description = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


def get_engine():
    """Create SQLAlchemy engine from DATABASE_URL."""
    url = os.getenv("DATABASE_URL")
    if not url:
        return None
    return create_engine(url)


def get_session_factory():
    """Return a sessionmaker or None if no DB is configured."""
    engine = get_engine()
    if engine is None:
        return None
    return sessionmaker(bind=engine)
