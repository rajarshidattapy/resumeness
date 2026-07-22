from fastapi import APIRouter, HTTPException
from app.models.ats import ATSAnalyzeRequest, ATSAnalyzeResponse
from app.services.ats_analyzer import analyze_ats_score
from app.services.ats_benchmark.evaluator import evaluate_against_jd
from app.utils.logger import logger

router = APIRouter(prefix="/api/ats", tags=["ats"])

@router.post("/analyze", response_model=ATSAnalyzeResponse)
async def analyze_ats(request: ATSAnalyzeRequest):
    """Analyze ATS compatibility of resume. Pass deep=true for the slower,
    LLM-judged benchmark (category scores + evidence) alongside the fast
    keyword score. The hot /api/chat path never sets deep=true — this is
    the on-demand "Deep Analyze" path only."""
    try:
        score, matched, missing, suggestions = analyze_ats_score(
            request.resumeLatex,
            request.jobDescription
        )

        benchmark = None
        if request.deep:
            benchmark = await evaluate_against_jd(request.resumeLatex, request.jobDescription)

        return ATSAnalyzeResponse(
            score=score,
            matchedKeywords=matched,
            missingKeywords=missing,
            suggestions=suggestions,
            benchmark=benchmark,
        )

    except Exception as e:
        logger.error(f"ATS analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
