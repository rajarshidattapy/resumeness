"""FastAPI application entry point."""

import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import agent_router, knowledge_router, resume_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown logic."""
    print("🚀 Resumeness AI Backend starting...")
    yield
    print("👋 Resumeness AI Backend shutting down...")


app = FastAPI(
    title="Resumeness AI Backend",
    description="AI-powered resume optimization backend with LangChain agent orchestration",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
cors_origins_raw = os.getenv(
    "CORS_ORIGINS",
    '["http://localhost:5173","http://localhost:3000","http://localhost:8080"]',
)
try:
    cors_origins = json.loads(cors_origins_raw)
except (json.JSONDecodeError, TypeError):
    cors_origins = ["http://localhost:5173", "http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(agent_router, prefix="/agent", tags=["Agent"])
app.include_router(knowledge_router, prefix="/knowledge", tags=["Knowledge Base"])
app.include_router(resume_router, prefix="/resume", tags=["Resume"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "resumeness-ai-backend"}
