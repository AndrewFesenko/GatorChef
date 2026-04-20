from __future__ import annotations

from pydantic import BaseModel


class SessionCreateRequest(BaseModel):
    image_hash: str  # SHA-256 hex string of the uploaded image bytes


class SessionCreateResponse(BaseModel):
    session_id: str
