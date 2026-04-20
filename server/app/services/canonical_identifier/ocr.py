"""Google Cloud Vision OCR — image bytes to raw receipt lines.

Uses `document_text_detection` which is tuned for dense printed text (receipts,
documents). Returns the full_text_annotation lines in reading order. The client
is cached at module level after first construction.
"""

from __future__ import annotations

import os

from fastapi import HTTPException, status


def _client():
    """Lazy-import and cache the Vision client — import is slow at module load."""
    global _cached_client
    if _cached_client is not None:
        return _cached_client

    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GOOGLE_APPLICATION_CREDENTIALS is not set. Cannot run OCR.",
        )

    try:
        from google.cloud import vision as _vision
        _cached_client = _vision.ImageAnnotatorClient()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to initialize Google Cloud Vision client: {exc}",
        ) from exc

    return _cached_client


_cached_client = None


def extract_lines(image_bytes: bytes) -> tuple[str, list[str]]:
    """Run OCR on image bytes.

    Returns (raw_text, lines) where raw_text is the full verbatim OCR string
    and lines is a list of non-empty stripped lines in reading order.

    Raises HTTPException(502) on provider errors.
    Returns ("", []) when the image produces no text — callers use warnings.py
    to categorize this, not an exception.
    """
    from google.cloud import vision as _vision

    client = _client()

    try:
        image = _vision.Image(content=image_bytes)
        response = client.document_text_detection(image=image)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Cloud Vision request failed: {exc}",
        ) from exc

    if response.error.message:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Cloud Vision error: {response.error.message}",
        )

    raw_text: str = getattr(response.full_text_annotation, "text", "") or ""
    lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
    return raw_text, lines
