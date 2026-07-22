"""Clerk JWT verification for FastAPI routes.

Verifies the bearer token against Clerk's JWKS and returns the token
subject (Clerk user id). Routes that accept a `user_id` path param use
this to ensure a caller can only act on their own data.
"""
import os
import time
from typing import Optional

import jwt
from fastapi import Header, HTTPException
from jwt import PyJWKClient

from app.utils.logger import logger

_ISSUER = os.getenv("CLERK_JWT_ISSUER", "")
_jwks_client: Optional[PyJWKClient] = None
_jwks_client_issuer = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client, _jwks_client_issuer
    if not _ISSUER:
        raise HTTPException(status_code=500, detail="CLERK_JWT_ISSUER is not configured")
    if _jwks_client is None or _jwks_client_issuer != _ISSUER:
        _jwks_client = PyJWKClient(f"{_ISSUER.rstrip('/')}/.well-known/jwks.json")
        _jwks_client_issuer = _ISSUER
    return _jwks_client


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """FastAPI dependency: verifies the Clerk session JWT and returns its subject (user id)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization[len("Bearer "):]

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=_ISSUER,
            options={"require": ["exp", "iat", "sub"]},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if payload.get("exp", 0) < time.time():
        raise HTTPException(status_code=401, detail="Token expired")

    return payload["sub"]


def require_matching_user(path_user_id: str, token_user_id: str) -> None:
    """Raises 403 if the verified caller doesn't match the user_id in the URL."""
    if path_user_id != token_user_id:
        raise HTTPException(status_code=403, detail="Cannot access another user's data")
