from fastapi import APIRouter, HTTPException
from app.models.ats import ATSAnalyzeRequest, ATSAnalyzeResponse
from app.services.ats_analyzer import analyze_ats_score
from app.utils.logger import logger

router = APIRouter(prefix="/api/ats", tags=["ats"])

@router.post("/analyze", response_model=ATSAnalyzeResponse)
async def analyze_ats(request: ATSAnalyzeRequest):
    """Analyze ATS compatibility of resume"""
    try:
        score, matched, missing, suggestions = analyze_ats_score(
            request.resumeLatex,
            request.jobDescription
        )
        
        return ATSAnalyzeResponse(
            score=score,
            matchedKeywords=matched,
            missingKeywords=missing,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"ATS analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
