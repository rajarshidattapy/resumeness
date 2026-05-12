import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from openai import AsyncOpenAI
import os

from app.models import KnowledgeItem, Message
from app.services.extractor import extract_job_requirements
from app.services.retriever import retrieve_relevant_kb_items
from app.services.optimizer import optimize_resume
from app.services.ats_analyzer import analyze_ats_score
from app.utils.logger import logger

router = APIRouter(prefix="/api/chat", tags=["chat"])
_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are Resumeness AI, a professional resume optimization assistant.

When the user provides a job description:
- Briefly acknowledge the role and what you detected (key skills, requirements)
- Explain that you are analyzing their resume and knowledge base
- After analysis, summarize the key improvements you made

Keep responses concise and professional (3–5 sentences max for the intro).
Never fabricate experience or metrics. Focus on actionable insights."""


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
    has_jd = len(jd.strip()) > 50
    has_resume = len(request.resumeLatex.strip()) > 100

    ai_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in request.messages:
        ai_messages.append({"role": msg.role, "content": msg.content})

    try:
        # ── 1. Stream conversational AI response ──────────────────────────────
        stream = await _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=ai_messages,
            stream=True,
            temperature=0.5,
            max_tokens=450,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield _sse({"type": "text", "content": delta.content})

        # ── 2. ATS analysis ───────────────────────────────────────────────────
        if has_jd and has_resume:
            yield _sse({"type": "status", "content": "Analyzing ATS compatibility…"})
            score, matched, missing, suggestions = analyze_ats_score(
                request.resumeLatex, jd
            )
            yield _sse({
                "type": "ats",
                "score": score,
                "matchedKeywords": matched,
                "missingKeywords": missing,
                "suggestions": suggestions,
            })

            # ── 3. Optimization ───────────────────────────────────────────────
            if request.knowledgeBaseItems:
                yield _sse({"type": "status", "content": "Retrieving relevant experience…"})
                relevant = await retrieve_relevant_kb_items(
                    jd, request.knowledgeBaseItems, top_k=5
                )

                yield _sse({"type": "status", "content": "Generating resume improvements…"})
                result = await optimize_resume(request.resumeLatex, jd, relevant)

                patches = result.get("patches", [])
                applied = result.get("appliedCount", 0)
                updated_latex = result.get("updatedLatex", request.resumeLatex)

                if applied > 0:
                    # Compute post-optimization ATS score
                    score_after, matched_after, _, _ = analyze_ats_score(updated_latex, jd)
                    yield _sse({
                        "type": "patches",
                        "changes": patches,
                        "summary": result.get("summary", ""),
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

        yield _sse({"type": "done"})

    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        yield _sse({"type": "error", "content": "An error occurred. Please try again."})


@router.post("")
async def chat(request: ChatRequest):
    return StreamingResponse(
        _stream(request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
