from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.recipe import RecipeMatch

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("/match", response_model=list[RecipeMatch])
async def match_recipes(
    top: int = Query(default=5, ge=1, le=20),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _ = current_user
    # todo phase 4 implement recipe matching
    # 1 fetch user pantry items
    # 2 call recipe_service.match_recipes(pantry_items, top)
    # 3 return list of recipe matches
    raise NotImplementedError
