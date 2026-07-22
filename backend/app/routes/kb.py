import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user_id, require_matching_user
from app.db.mongo import get_db
from app.services.embedding_service import get_embedding
from app.utils.logger import logger

router = APIRouter(prefix="/api/kb", tags=["knowledge-base"])


class CreateKBItem(BaseModel):
    type: str
    title: str
    content: str
    tags: List[str]


class UpdateKBItem(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None


def _doc_out(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    doc.pop("embedding", None)
    return doc


@router.get("/{user_id}")
async def list_kb_items(user_id: str, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    items = await db.knowledge_base.find({"userId": user_id}).to_list(None)
    return [_doc_out(i) for i in items]


@router.post("/{user_id}")
async def create_kb_item(user_id: str, item: CreateKBItem, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    item_text = f"{item.title} {item.content} {' '.join(item.tags)}"
    embedding = await get_embedding(item_text)
    doc = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "type": item.type,
        "title": item.title,
        "content": item.content,
        "tags": item.tags,
        "embedding": embedding,
    }
    result = await db.knowledge_base.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc.pop("embedding", None)
    logger.info(f"Created KB item '{item.title}' for user {user_id}")
    return doc


@router.put("/{user_id}/{item_id}")
async def update_kb_item(user_id: str, item_id: str, updates: UpdateKBItem, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    existing = await db.knowledge_base.find_one({"id": item_id, "userId": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        merged = {**existing, **update_data}
        item_text = f"{merged['title']} {merged['content']} {' '.join(merged['tags'])}"
        update_data["embedding"] = await get_embedding(item_text)
        await db.knowledge_base.update_one({"id": item_id, "userId": user_id}, {"$set": update_data})

    item = await db.knowledge_base.find_one({"id": item_id, "userId": user_id})
    return _doc_out(item)


@router.delete("/{user_id}/{item_id}")
async def delete_kb_item(user_id: str, item_id: str, caller_id: str = Depends(get_current_user_id)):
    require_matching_user(user_id, caller_id)
    db = get_db()
    result = await db.knowledge_base.delete_one({"id": item_id, "userId": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    logger.info(f"Deleted KB item {item_id} for user {user_id}")
    return {"success": True}


@router.post("/{user_id}/sync")
async def sync_kb_items(user_id: str, items: List[dict], caller_id: str = Depends(get_current_user_id)):
    """Bulk sync KB items from the frontend localStorage to MongoDB."""
    require_matching_user(user_id, caller_id)
    db = get_db()
    upserted = 0
    for item in items:
        item_id = item.get("id")
        if not item_id:
            continue
        item_text = f"{item.get('title','')} {item.get('content','')} {' '.join(item.get('tags', []))}"
        try:
            embedding = await get_embedding(item_text)
        except Exception:
            embedding = []
        doc = {
            "userId": user_id,
            "type": item.get("type", "project"),
            "title": item.get("title", ""),
            "content": item.get("content", ""),
            "tags": item.get("tags", []),
            "embedding": embedding,
        }
        await db.knowledge_base.update_one(
            {"id": item_id, "userId": user_id},
            {"$set": doc, "$setOnInsert": {"id": item_id}},
            upsert=True,
        )
        upserted += 1

    logger.info(f"Synced {upserted} KB items for user {user_id}")
    return {"synced": upserted}
