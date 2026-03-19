from fastapi import APIRouter, Response, status

from app.schemas.pantry import PantryItemCreate, PantryItemResponse, PantryItemUpdate
from app.services.pantry_service import pantry_service


router = APIRouter(prefix="/pantry", tags=["pantry"])


@router.get("", response_model=list[PantryItemResponse])
def list_pantry_items() -> list[PantryItemResponse]:
    return pantry_service.list_items()


@router.post("", response_model=PantryItemResponse, status_code=status.HTTP_201_CREATED)
def create_pantry_item(
    payload: PantryItemCreate,
) -> PantryItemResponse:
    return pantry_service.create_item(payload)


@router.put("/{item_id}", response_model=PantryItemResponse)
def update_pantry_item(
    item_id: str,
    payload: PantryItemUpdate,
) -> PantryItemResponse:
    return pantry_service.update_item(item_id, payload)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pantry_item(item_id: str) -> Response:
    pantry_service.delete_item(item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
