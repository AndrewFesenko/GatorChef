from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.upload import ExtractedReceiptItem, ReceiptUploadResponse
from app.services import glm_ocr_service, normalizer

router = APIRouter(prefix="/upload", tags=["upload"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 mb
_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}


def _sniff_mime_from_bytes(data: bytes) -> str | None:
    if data[:5] == b"%PDF-":
        return "application/pdf"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return None


@router.post("/receipt", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _ = current_user

    # read and validate file
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(image_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    content_type = (file.content_type or "").lower().strip()
    if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload JPG, PNG, or PDF (HEIC is not supported).",
        )

    sniffed_mime = _sniff_mime_from_bytes(image_bytes)
    if sniffed_mime not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file content. Please upload JPG, PNG, or PDF (HEIC is not supported).",
        )

    raw_text, parsed_names = await glm_ocr_service.extract_receipt_items(image_bytes)
    normalized_names = [normalizer.normalize_receipt_item_name(name) for name in parsed_names if name.strip()]

    # keep first-seen order while removing duplicates
    deduped_names = list(dict.fromkeys(normalized_names))
    items = [ExtractedReceiptItem(name=name) for name in deduped_names]

    return ReceiptUploadResponse(raw_text=raw_text, parsed_items=items)
