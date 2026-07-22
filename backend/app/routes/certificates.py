from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.db.mongo import get_db
from app.services.certificate import get_certificate

router = APIRouter(prefix="/api/certificates", tags=["certificates"])


@router.get("/{cert_id}")
async def verify_certificate(cert_id: str):
    """Public verification endpoint — no auth. Anyone with a cert_id can confirm
    it was genuinely issued by this backend and hasn't been tampered with."""
    cert = await get_certificate(cert_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return cert


@router.get("/{cert_id}/pdf")
async def download_certificate(cert_id: str):
    db = get_db()
    doc = await db.certificates.find_one({"id": cert_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return Response(
        content=doc["pdf"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="certificate-{cert_id}.pdf"'},
    )
