import time
from uuid import uuid4

from fastapi import HTTPException, status

from app.clients.firestore_client import get_firestore_client
from app.schemas.pantry import PantryItemCreate, PantryItemResponse, PantryItemUpdate


class PantryService:
    def _collection(self, user_id: str):
        try:
            db = get_firestore_client()
            # keep pantry items scoped under each authenticated user document
            return db.collection("users").document(user_id).collection("pantry")
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Firestore connection failed: {exc}",
            ) from exc

    def list_items(self, user_id: str) -> list[PantryItemResponse]:
        try:
            documents = self._collection(user_id).stream()
            items = [PantryItemResponse(id=document.id, **document.to_dict()) for document in documents]
            # default to most recently created first then tie-break by name
            return sorted(items, key=lambda item: (item.created_at or 0, item.name.lower()), reverse=True)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Firestore read failed: {exc}",
            ) from exc

    def create_item(self, user_id: str, payload: PantryItemCreate) -> PantryItemResponse:
        try:
            created_at = int(time.time())
            data = {
                **payload.model_dump(),
                "created_at": created_at,
            }
            item = PantryItemResponse(id=f"pantry_{uuid4().hex[:8]}", **data)
            self._collection(user_id).document(item.id).set(data)
            return item
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Firestore write failed: {exc}",
            ) from exc

    def update_item(self, user_id: str, item_id: str, payload: PantryItemUpdate) -> PantryItemResponse:
        try:
            document = self._collection(user_id).document(item_id)
            snapshot = document.get()
            if not snapshot.exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Pantry item '{item_id}' not found",
                )

            existing = snapshot.to_dict() or {}
            created_at = existing.get("created_at")
            if not isinstance(created_at, int):
                created_at = int(time.time())

            updated_data = {
                **payload.model_dump(),
                "created_at": created_at,
            }

            document.set(updated_data)
            return PantryItemResponse(id=item_id, **updated_data)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Firestore update failed: {exc}",
            ) from exc

    def delete_item(self, user_id: str, item_id: str) -> None:
        try:
            document = self._collection(user_id).document(item_id)
            if not document.get().exists:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Pantry item '{item_id}' not found",
                )

            document.delete()
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Firestore delete failed: {exc}",
            ) from exc


pantry_service = PantryService()
