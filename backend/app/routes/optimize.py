from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.auth import get_current_user_id
from app.models.resume import OptimizeRequest, OptimizeResponse, ResumePatch
from app.services.extractor import extract_job_requirements
from app.services.retriever import retrieve_relevant_kb_items
from app.services.optimizer import optimize_resume
from app.services.ats_analyzer import analyze_ats_score
from app.services.gap_analysis import find_knowledge_gaps, GapItem
from app.services.learning_path import suggest_learning_path, LearningPathResult
from app.utils.logger import logger

router = APIRouter(prefix="/api/optimize", tags=["optimize"])


@router.post("/extract")
async def extract_jd(request: dict):
    """Extract structured requirements from a job description."""
    job_description = request.get("jobDescription", "")
    if not job_description:
        raise HTTPException(status_code=400, detail="jobDescription is required")
    try:
        return await extract_job_requirements(job_description)
    except Exception as e:
        logger.error(f"Extract error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class FullOptimizeResponse(BaseModel):
    changes: List[ResumePatch]
    summary: str
    atsScoreBefore: int
    atsScoreAfter: int
    updatedLatex: str
    appliedCount: int


@router.post("", response_model=FullOptimizeResponse)
async def optimize(request: OptimizeRequest):
    """Full optimization pipeline: extract → retrieve → optimize → patch."""
    try:
        logger.info("Starting resume optimization")

        score_before, matched_before, _, _ = analyze_ats_score(
            request.resumeLatex, request.jobDescription
        )

        relevant_items = await retrieve_relevant_kb_items(
            request.jobDescription, request.knowledgeBaseItems, top_k=5
        )

        result = await optimize_resume(
            request.resumeLatex, request.jobDescription, relevant_items
        )

        patches = [
            ResumePatch(
                section=p.get("section", ""),
                target=p.get("old", "")[:60],
                old=p.get("old", ""),
                new=p.get("new", ""),
            )
            for p in result.get("patches", [])
        ]

        updated_latex = result.get("updatedLatex", request.resumeLatex)
        score_after, _, _, _ = analyze_ats_score(updated_latex, request.jobDescription)
        applied = result.get("appliedCount", 0)

        logger.info(f"Optimization: {score_before}% → {score_after}%, {applied} patches applied")

        return FullOptimizeResponse(
            changes=patches,
            summary=result.get("summary", "Resume optimized."),
            atsScoreBefore=score_before,
            atsScoreAfter=score_after,
            updatedLatex=updated_latex,
            appliedCount=applied,
        )

    except Exception as e:
        logger.error(f"Optimization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class GapsRequest(BaseModel):
    jobDescription: str
    knowledgeBaseItems: List[dict]


class GapsResponse(BaseModel):
    gaps: List[GapItem]


@router.post("/gaps", response_model=GapsResponse)
async def gaps(request: GapsRequest, _user_id: str = Depends(get_current_user_id)):
    """JD requirements with no strong match anywhere in the user's knowledge base."""
    try:
        found = await find_knowledge_gaps(request.jobDescription, request.knowledgeBaseItems)
        return GapsResponse(gaps=found)
    except Exception as e:
        logger.error(f"Gap analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class LearningPathRequest(BaseModel):
    requirement: str


@router.post("/learning-path", response_model=LearningPathResult)
async def learning_path(request: LearningPathRequest, _user_id: str = Depends(get_current_user_id)):
    """Curated (not searched) source suggestions for a gap requirement."""
    result = await suggest_learning_path(request.requirement)
    if not result:
        raise HTTPException(status_code=500, detail="Could not generate a learning path")
    return result
