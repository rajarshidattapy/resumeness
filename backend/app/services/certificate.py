import hashlib
import hmac
import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional

from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

from app.db.mongo import get_db
from app.utils.logger import logger

PASS_THRESHOLD = 80


def _secret() -> bytes:
    return os.getenv("CERT_SIGNING_SECRET", "").encode("utf-8")


def _compute_hash(cert_id: str, user_id: str, kb_item_id: str, issued_at: str) -> str:
    message = f"{cert_id}|{user_id}|{kb_item_id}|{issued_at}".encode("utf-8")
    return hmac.new(_secret(), message, hashlib.sha256).hexdigest()


def _render_pdf(skill_title: str, score: int, issued_at: str, cert_id: str) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)

    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 1.5 * inch, "Certificate of Verified Skill")

    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 2.2 * inch, "Resumeness AI")

    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 3.2 * inch, skill_title)

    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 3.8 * inch, f"Quiz score: {score}%")
    c.drawCentredString(width / 2, height - 4.2 * inch, f"Issued: {issued_at}")

    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 1 * inch, f"Verify at /verify/{cert_id}")

    c.showPage()
    c.save()
    return buffer.getvalue()


async def issue_certificate(user_id: str, kb_item_id: str, skill_title: str, score: int) -> Optional[str]:
    """Issues a certificate if score qualifies. Returns the certificate id, or None."""
    if score < PASS_THRESHOLD:
        return None

    cert_id = str(uuid.uuid4())
    issued_at = datetime.now(timezone.utc).isoformat()
    verify_hash = _compute_hash(cert_id, user_id, kb_item_id, issued_at)
    pdf_bytes = _render_pdf(skill_title, score, issued_at, cert_id)

    doc = {
        "id": cert_id,
        "userId": user_id,
        "kbItemId": kb_item_id,
        "skillTitle": skill_title,
        "score": score,
        "issuedAt": issued_at,
        "verifyHash": verify_hash,
        "pdf": pdf_bytes,
    }

    try:
        db = get_db()
        await db.certificates.insert_one(doc)
        logger.info(f"Issued certificate {cert_id} for user {user_id} ({skill_title}, {score}%)")
        return cert_id
    except RuntimeError:
        # Mongo unavailable — certificate can't be persisted/verified later.
        logger.warning("Cannot issue certificate: MongoDB unavailable")
        return None


async def get_certificate(cert_id: str) -> Optional[dict]:
    db = get_db()
    doc = await db.certificates.find_one({"id": cert_id})
    if not doc:
        return None

    expected_hash = _compute_hash(doc["id"], doc["userId"], doc["kbItemId"], doc["issuedAt"])
    valid = hmac.compare_digest(expected_hash, doc.get("verifyHash", ""))

    return {
        "id": doc["id"],
        "skillTitle": doc["skillTitle"],
        "score": doc["score"],
        "issuedAt": doc["issuedAt"],
        "valid": valid,
    }
