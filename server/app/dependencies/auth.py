from __future__ import annotations

import os
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.clients.firestore_client import get_firestore_client


bearer_scheme = HTTPBearer(auto_error=False)
TOKEN_CLOCK_SKEW_SECONDS = int(os.getenv("FIREBASE_TOKEN_CLOCK_SKEW_SECONDS", "10"))


@dataclass
class AuthenticatedUser:
    uid: str
    email: str | None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    # token from Authorization: Bearer <token>
    token = credentials.credentials

    try:
        import firebase_admin
        from firebase_admin import auth as firebase_auth
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="firebase-admin is not installed on the backend",
        ) from exc

    # Ensure Firebase app is initialized by reusing Firestore client setup.
    get_firestore_client()

    try:
        decoded = firebase_auth.verify_id_token(
            token,
            check_revoked=False,
            clock_skew_seconds=TOKEN_CLOCK_SKEW_SECONDS,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}") from exc

    uid = decoded.get("uid")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing uid claim")

    # we only pass fields currently needed by routes/services
    return AuthenticatedUser(uid=uid, email=decoded.get("email"))
