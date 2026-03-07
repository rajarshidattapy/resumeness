"""Resume routes — compile LaTeX, compute ATS score."""

import base64

import httpx
from fastapi import APIRouter

from app.schemas import (
    ATSScoreRequest,
    ATSScoreResponse,
    ResumeCompileRequest,
    ResumeCompileResponse,
)
from app.tools.ats_score import ATSScoreCalculator

router = APIRouter()

LATEX_API_URL = "https://latex.ytotech.com/builds/sync"


@router.post("/compile", response_model=ResumeCompileResponse)
async def compile_resume(request: ResumeCompileRequest):
    """Compile LaTeX content to PDF using the ytotech API."""
    payload = {
        "compiler": "pdflatex",
        "resources": [{"main": True, "content": request.latex_content}],
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                LATEX_API_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

        content_type = resp.headers.get("content-type", "")
        if "application/pdf" in content_type:
            pdf_b64 = base64.b64encode(resp.content).decode("utf-8")
            return ResumeCompileResponse(success=True, pdf_base64=pdf_b64)

        # Error from the API
        try:
            error_body = resp.json()
            error_msg = error_body.get("error", resp.text[:500])
        except Exception:
            error_msg = resp.text[:500]

        return ResumeCompileResponse(success=False, error=error_msg)

    except httpx.TimeoutException:
        return ResumeCompileResponse(success=False, error="LaTeX compilation timed out")
    except Exception as exc:
        return ResumeCompileResponse(success=False, error=str(exc))


@router.post("/ats-score", response_model=ATSScoreResponse)
async def compute_ats_score(request: ATSScoreRequest):
    """Compute ATS compatibility score for a resume against a job description."""
    calculator = ATSScoreCalculator()
    result = calculator.calculate(request.resume_latex, request.job_description)
    return ATSScoreResponse(**result)
