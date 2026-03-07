"""Agent routes — POST /agent/run."""

import time

from fastapi import APIRouter, HTTPException

from app.agents.resume_agent import ResumeOptimizationAgent
from app.schemas import AgentRunRequest, AgentRunResponse

router = APIRouter()


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(request: AgentRunRequest):
    """Execute the full resume optimization agent pipeline.

    Steps:
    1. Analyze job description
    2. Retrieve relevant knowledge
    3. Rewrite LaTeX resume
    4. Calculate ATS scores
    5. Self-check and improve
    """
    start = time.time()

    try:
        agent = ResumeOptimizationAgent()
        result = await agent.run(
            job_description=request.job_description,
            resume_latex=request.resume_latex,
            knowledge_base=[kb.model_dump() for kb in request.knowledge_base],
        )

        elapsed_ms = int((time.time() - start) * 1000)
        return AgentRunResponse(
            updated_resume_latex=result["updated_resume_latex"],
            ats_score_before=result["ats_score_before"],
            ats_score_after=result["ats_score_after"],
            changes_summary=result["changes_summary"],
            changes=result.get("changes", []),
            execution_time_ms=elapsed_ms,
            success=result["success"],
        )

    except Exception as exc:
        elapsed_ms = int((time.time() - start) * 1000)
        raise HTTPException(
            status_code=500,
            detail={
                "error": str(exc),
                "execution_time_ms": elapsed_ms,
            },
        )
