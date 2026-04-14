from __future__ import annotations

from pydantic import BaseModel


class ExtractedReceiptItem(BaseModel):
    name: str


class ReceiptUploadResponse(BaseModel):
    raw_text: str
    parsed_items: list[ExtractedReceiptItem]
