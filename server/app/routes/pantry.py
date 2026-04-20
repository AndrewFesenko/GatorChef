from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from app.clients.firestore_client import get_firestore_client
from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.pantry import PantryItemCreate, PantryItemResponse, PantryItemUpdate
from app.services.pantry_service import pantry_service


router = APIRouter(prefix="/pantry", tags=["pantry"])


class _BatchItem(BaseModel):
    name: str


class PantryBatchRequest(BaseModel):
    session_id: str
    items: list[_BatchItem]


class PantryBatchResponse(BaseModel):
    created: list[PantryItemResponse]


@router.get("", response_model=list[PantryItemResponse])
def list_pantry_items(current_user: AuthenticatedUser = Depends(get_current_user)) -> list[PantryItemResponse]:
    return pantry_service.list_items(current_user.uid)


@router.post("", response_model=PantryItemResponse, status_code=status.HTTP_201_CREATED)
def create_pantry_item(
    payload: PantryItemCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> PantryItemResponse:
    return pantry_service.create_item(current_user.uid, payload)


@router.put("/{item_id}", response_model=PantryItemResponse)
def update_pantry_item(
    item_id: str,
    payload: PantryItemUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> PantryItemResponse:
    return pantry_service.update_item(current_user.uid, item_id, payload)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(
    item_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Response:
    pantry_service.delete_item(current_user.uid, item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/batch", response_model=PantryBatchResponse, status_code=status.HTTP_201_CREATED)
def create_pantry_items_from_scan(
    payload: PantryBatchRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> PantryBatchResponse:
    """Bulk-create pantry items from a confirmed OCR scan session."""
    try:
        db = get_firestore_client()
        session_ref = (
            db.collection("users")
            .document(current_user.uid)
            .collection("ocr_sessions")
            .document(payload.session_id)
        )
        session_snap = session_ref.get()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore read failed: {exc}",
        ) from exc

    if not session_snap.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    session_data = session_snap.to_dict() or {}
    if session_data.get("uid") != current_user.uid:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )

    created: list[PantryItemResponse] = []
    for batch_item in payload.items:
        item_payload = PantryItemCreate(
            name=batch_item.name,
            category=None,
            expiry="unknown",
            source="scan",
            source_ref=payload.session_id,
        )
        created.append(pantry_service.create_item(current_user.uid, item_payload))

    try:
        session_ref.update({"status": "confirmed"})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore update failed: {exc}",
        ) from exc

    return PantryBatchResponse(created=created)
