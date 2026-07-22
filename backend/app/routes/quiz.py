from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from app.auth import get_current_user_id, require_matching_user
from app.db.mongo import get_db
from app.models.quiz import QuizSubmitRequest, QuizSubmitResponse
from app.services.certificate import issue_certificate
from app.services.quiz import generate_quiz, score_quiz
from app.utils.logger import logger

router = APIRouter(prefix="/api/kb", tags=["quiz"])


@router.post("/{user_id}/{item_id}/quiz")
async def create_quiz(user_id: str, item_id: str, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    item = await db.knowledge_base.find_one({"id": item_id, "userId": user_id})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge base item not found")

    try:
        questions = await generate_quiz(item)
    except Exception as e:
        logger.error(f"Quiz generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

    if not questions:
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

    return {"questions": [q.model_dump() for q in questions]}


@router.post("/{user_id}/{item_id}/quiz/submit", response_model=QuizSubmitResponse)
async def submit_quiz(
    user_id: str,
    item_id: str,
    request: QuizSubmitRequest,
    caller_id: str = Depends(get_current_user_id),
):
    require_matching_user(user_id, caller_id)
    db = get_db()
    item = await db.knowledge_base.find_one({"id": item_id, "userId": user_id})
    if not item:
        raise HTTPException(status_code=404, detail="Knowledge base item not found")

    score, correct = score_quiz(request.questions, request.answers)

    attempt = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "kbItemId": item_id,
        "questions": [q.model_dump() for q in request.questions],
        "answers": request.answers,
        "score": score,
        "timestamp": datetime.now(timezone.utc),
    }
    await db.quiz_attempts.insert_one(attempt)

    certificate_id = await issue_certificate(user_id, item_id, item.get("title", "Skill"), score)

    return QuizSubmitResponse(
        score=score,
        correctCount=correct,
        total=len(request.questions),
        certificateId=certificate_id,
    )


@router.get("/{user_id}/platform-score")
async def get_platform_score(user_id: str, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    attempts = await db.quiz_attempts.find({"userId": user_id}).to_list(None)

    # Best attempt per KB item — avoids a separate running counter that can
    # drift from the underlying attempts.
    best_by_item: dict[str, int] = {}
    for a in attempts:
        item_id = a["kbItemId"]
        best_by_item[item_id] = max(best_by_item.get(item_id, 0), a["score"])

    return {
        "platformScore": sum(best_by_item.values()),
        "itemsVerified": len(best_by_item),
    }
