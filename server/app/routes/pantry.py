from fastapi import APIRouter, Depends, Response, status

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.pantry import PantryItemCreate, PantryItemResponse, PantryItemUpdate
from app.services.pantry_service import pantry_service


router = APIRouter(prefix="/pantry", tags=["pantry"])


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
