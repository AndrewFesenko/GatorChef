from fastapi import APIRouter, HTTPException, status

from app.services.ingredient_loader import get_mealdb_ingredients

router = APIRouter(prefix="/ingredients", tags=["ingredients"])


@router.get("", response_model=list[str])
async def list_ingredients() -> list[str]:
    try:
        return await get_mealdb_ingredients()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch ingredient list: {exc}",
        ) from exc
