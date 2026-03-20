from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.clients.firestore_client import get_firestore_client
from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.user import UserProfileResponse, UserProfileUpsert


router = APIRouter(prefix="/users", tags=["users"])


def _user_doc(uid: str):
    try:
        db = get_firestore_client()
        # user profile root document; pantry stays in a subcollection under this
        return db.collection("users").document(uid)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Firestore connection failed: {exc}",
        ) from exc


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)) -> UserProfileResponse:
    document = _user_doc(current_user.uid).get()
    if not document.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    payload = document.to_dict() or {}
    return UserProfileResponse(
        uid=current_user.uid,
        email=payload.get("email", current_user.email or ""),
        display_name=payload.get("display_name", ""),
        photo_url=payload.get("photo_url"),
    )


@router.put("/me", response_model=UserProfileResponse)
def upsert_my_profile(
    profile: UserProfileUpsert,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfileResponse:
    now = datetime.now(timezone.utc).isoformat()
    doc_ref = _user_doc(current_user.uid)

    # Merge preserves any nested subcollections like pantry while updating profile fields.
    doc_ref.set(
        {
            "email": profile.email,
            "display_name": profile.display_name,
            "photo_url": profile.photo_url,
            "updated_at": now,
        },
        merge=True,
    )

    return UserProfileResponse(
        uid=current_user.uid,
        email=profile.email,
        display_name=profile.display_name,
        photo_url=profile.photo_url,
    )
