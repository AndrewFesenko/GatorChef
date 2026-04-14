from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.clients.firestore_client import get_firestore_client
from app.schemas.pantry import PantryItemResponse
from app.services.glm_ocr_service import extract_ingredients

router = APIRouter(prefix="/upload", tags=["upload"])

_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


class ReceiptUploadResponse(BaseModel):
    parsed_items: list[PantryItemResponse]


@router.post("/receipt", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    image_bytes = await file.read()
    if len(image_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 10MB)")

    names = await extract_ingredients(image_bytes)

    db = get_firestore_client()
    pantry_ref = db.collection("users").document(current_user.uid).collection("pantry")
    items: list[PantryItemResponse] = []

    for name in names:
        doc_ref = pantry_ref.document()
        item_data = {"name": name, "category": "Produce", "expiry": "unknown"}
        doc_ref.set(item_data)
        items.append(PantryItemResponse(id=doc_ref.id, **item_data))

    return ReceiptUploadResponse(parsed_items=items)
