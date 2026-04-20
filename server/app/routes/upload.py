from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.clients.firestore_client import get_firestore_client
from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.session import SessionCreateRequest, SessionCreateResponse
from app.schemas.upload import ExtractedReceiptItem, ReceiptUploadResponse
from app.services.canonical_identifier import PipelineResult, identify_receipt

router = APIRouter(prefix="/upload", tags=["upload"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}


def _sniff_mime_from_bytes(data: bytes) -> str | None:
    if data[:5] == b"%PDF-":
        return "application/pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return None


_DEDUP_WINDOW_SECONDS = 30


def _user_ref(uid: str):
    try:
        db = get_firestore_client()
        return db.collection("users").document(uid)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore connection failed: {exc}",
        ) from exc


def _sessions_collection(uid: str):
    return _user_ref(uid).collection("ocr_sessions")


def _locks_collection(uid: str):
    return _user_ref(uid).collection("upload_locks")


@router.post("/session", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_ocr_session(
    payload: SessionCreateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> SessionCreateResponse:
    """Create a pending OCR session.

    Dedup: if the exact same image bytes (same SHA-256) were submitted by this
    user within the last 30 seconds, reject with 409.  After that window the
    same image can be re-uploaded freely — contributors reusing demo images and
    users retrying a failed scan should never be permanently blocked.

    The lock lives at users/{uid}/upload_locks/{image_hash} and is a single
    document read — no composite index required.
    """
    try:
        now = datetime.now(tz=timezone.utc)
        cutoff = now - timedelta(seconds=_DEDUP_WINDOW_SECONDS)

        lock_ref = _locks_collection(current_user.uid).document(payload.image_hash)
        lock_doc = lock_ref.get()
        if lock_doc.exists:
            lock_data = lock_doc.to_dict() or {}
            locked_at = lock_data.get("created_at")
            if locked_at and locked_at > cutoff:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This image was just submitted — please wait a moment before re-uploading.",
                )

        sessions = _sessions_collection(current_user.uid)
        doc_ref = sessions.document()
        session_id = doc_ref.id

        doc_ref.set({
            "image_hash": payload.image_hash,
            "status": "pending",
            "uid": current_user.uid,
            "created_at": now,
        })

        lock_ref.set({"created_at": now, "session_id": session_id})

        return SessionCreateResponse(session_id=session_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore write failed: {exc}",
        ) from exc


@router.post("/receipt", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ReceiptUploadResponse:
    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
    if len(image_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 10MB)")

    content_type = (file.content_type or "").lower().strip()
    if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Please upload JPG, PNG, or PDF (HEIC is not supported).",
        )

    sniffed_mime = _sniff_mime_from_bytes(image_bytes)
    if sniffed_mime not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file content. Please upload JPG, PNG, or PDF (HEIC is not supported).",
        )

    sessions = _sessions_collection(current_user.uid)

    try:
        session_doc = sessions.document(session_id).get()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore read failed: {exc}",
        ) from exc

    if not session_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    session_data = session_doc.to_dict() or {}
    if session_data.get("uid") != current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    file_hash = hashlib.sha256(image_bytes).hexdigest()
    if file_hash != session_data.get("image_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File does not match the session image hash.",
        )

    try:
        result: PipelineResult = await identify_receipt(
            image_bytes, uid=current_user.uid, session_id=session_id
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"OCR pipeline failed: {exc}",
        ) from exc

    serialised_items = [
        {"name": item.name, "source_line": item.source_line, "match_kind": item.match_kind}
        for item in result.extracted_items
    ]

    try:
        sessions.document(session_id).update(
            {
                "status": "processed",
                "extracted_items": serialised_items,
                "unresolved": result.unresolved,
                "warnings": result.warnings,
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore update failed: {exc}",
        ) from exc

    return ReceiptUploadResponse(
        session_id=session_id,
        raw_text=result.raw_text,
        extracted_items=[
            ExtractedReceiptItem(
                name=item.name,
                source_line=item.source_line,
                match_kind=item.match_kind,
            )
            for item in result.extracted_items
        ],
        unresolved=result.unresolved,
        warnings=result.warnings,
    )
