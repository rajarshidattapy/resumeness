import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user_id, require_matching_user
from app.db.mongo import get_db
from app.utils.logger import logger

router = APIRouter(prefix="/api/resume", tags=["resume"])


class SaveVersionRequest(BaseModel):
    userId: str
    latex: str
    description: str
    atsScore: Optional[int] = None


@router.get("/{user_id}/versions")
async def get_versions(user_id: str, limit: int = 20, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    cursor = (
        db.resume_versions.find({"userId": user_id}, {"embedding": 0})
        .sort("timestamp", -1)
        .limit(limit)
    )
    versions = await cursor.to_list(None)
    for v in versions:
        v["_id"] = str(v["_id"])
        if isinstance(v.get("timestamp"), datetime):
            v["timestamp"] = v["timestamp"].isoformat()
    return versions


@router.post("/{user_id}/versions")
async def save_version(user_id: str, request: SaveVersionRequest, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    doc = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "latex": request.latex,
        "description": request.description,
        "atsScore": request.atsScore,
        "timestamp": datetime.now(timezone.utc),
    }
    result = await db.resume_versions.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["timestamp"] = doc["timestamp"].isoformat()
    logger.info(f"Saved resume version for user {user_id}")
    return doc


@router.delete("/{user_id}/versions/{version_id}")
async def delete_version(user_id: str, version_id: str, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    result = await db.resume_versions.delete_one({"id": version_id, "userId": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version not found")
    return {"success": True}
