from __future__ import annotations

from pydantic import BaseModel


class ExtractedReceiptItem(BaseModel):
    name: str
    source_line: str = ""
    match_kind: str = "exact"  # "exact" | "fuzzy" | "glm_fallback"


class ReceiptUploadResponse(BaseModel):
    session_id: str
    raw_text: str
    extracted_items: list[ExtractedReceiptItem]
    unresolved: list[str] = []
    warnings: list[str] = []
