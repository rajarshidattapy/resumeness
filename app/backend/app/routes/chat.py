import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from openai import AsyncOpenAI
import os

from app.models import Message
from app.services.editor import is_edit_command, apply_direct_edit
from app.services.retriever import retrieve_relevant_kb_items
from app.services.optimizer import optimize_resume
from app.services.ats_analyzer import analyze_ats_score
from app.utils.logger import logger

router = APIRouter(prefix="/api/chat", tags=["chat"])
_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are Resumeness AI, a professional resume editing assistant.

You handle two types of requests:

1. **Direct edits** ("change X to Y", "add Python to skills", "remove the third bullet"):
   - Confirm what you changed in 1–2 sentences. Be specific.

2. **Job description optimization** (user pastes a JD):
   - Briefly name the role and 2–3 key requirements you spotted.
   - Say you are optimizing the resume for this role.

Keep all responses to 3 sentences max. Never fabricate information."""


class ChatRequest(BaseModel):
    messages: List[Message]
    resumeLatex: str = ""
    jobDescription: str = ""
    knowledgeBaseItems: List[dict] = []


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def _stream(request: ChatRequest):
    user_text = request.messages[-1].content if request.messages else ""
    jd = request.jobDescription or ""
    has_resume = len(request.resumeLatex.strip()) > 100

    # ── Intent detection ──────────────────────────────────────────────────────
    intent_edit = has_resume and is_edit_command(user_text)
    # Treat as JD only when the message is substantial and NOT an edit command
    has_jd = (not intent_edit) and len(jd.strip()) > 50

    # ── 1. Stream conversational AI response ──────────────────────────────────
    ai_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.messages:
        ai_messages.append({"role": msg.role, "content": msg.content})

    try:
        stream = await _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=ai_messages,
            stream=True,
            temperature=0.5,
            max_tokens=200,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield _sse({"type": "text", "content": delta.content})
    except Exception as e:
        logger.error(f"Chat text stream error: {e}")
        yield _sse({"type": "text", "content": "Sorry, I encountered an error."})

    # ── 2. Action path ────────────────────────────────────────────────────────
    if not has_resume:
        yield _sse({"type": "done"})
        return

    try:
        if intent_edit:
            # ── Direct edit ───────────────────────────────────────────────────
            yield _sse({"type": "status", "content": "Applying your edit…"})
            result = await apply_direct_edit(request.resumeLatex, user_text)

            if result["success"]:
                updated_latex = result["updatedLatex"]
                score_after, matched_after, _, _ = analyze_ats_score(updated_latex, jd)
                yield _sse({
                    "type": "patches",
                    "changes": [],
                    "summary": f"Applied: {user_text}",
                    "updatedLatex": updated_latex,
                    "atsScoreBefore": None,
                    "atsScoreAfter": score_after,
                    "matchedKeywordsAfter": matched_after,
                })
            else:
                yield _sse({
                    "type": "status",
                    "content": "Could not find the requested text in the resume. Please check the exact wording.",
                })

        elif has_jd:
            # ── JD optimization ───────────────────────────────────────────────
            yield _sse({"type": "status", "content": "Analyzing ATS compatibility…"})
            score, matched, missing, suggestions = analyze_ats_score(request.resumeLatex, jd)
            yield _sse({
                "type": "ats",
                "score": score,
                "matchedKeywords": matched,
                "missingKeywords": missing,
                "suggestions": suggestions,
            })

            if request.knowledgeBaseItems:
                yield _sse({"type": "status", "content": "Retrieving relevant experience…"})
                relevant = await retrieve_relevant_kb_items(jd, request.knowledgeBaseItems, top_k=5)

                yield _sse({"type": "status", "content": "Generating resume improvements…"})
                opt = await optimize_resume(request.resumeLatex, jd, relevant)

                applied = opt.get("appliedCount", 0)
                updated_latex = opt.get("updatedLatex", request.resumeLatex)

                if applied > 0:
                    score_after, matched_after, _, _ = analyze_ats_score(updated_latex, jd)
                    yield _sse({
                        "type": "patches",
                        "changes": opt.get("patches", []),
                        "summary": opt.get("summary", ""),
                        "updatedLatex": updated_latex,
                        "atsScoreBefore": score,
                        "atsScoreAfter": score_after,
                        "matchedKeywordsAfter": matched_after,
                    })
                else:
                    yield _sse({
                        "type": "status",
                        "content": "No applicable improvements found for this resume/JD combination.",
                    })

    except Exception as e:
        logger.error(f"Action error: {e}")
        yield _sse({"type": "error", "content": "An error occurred. Please try again."})

    yield _sse({"type": "done"})


@router.post("")
async def chat(request: ChatRequest):
    return StreamingResponse(
        _stream(request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
