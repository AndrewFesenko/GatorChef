from fastapi import APIRouter, Depends, Query

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.recipe import RecipeDetail, RecipeMatchResponse, RecipeSummary
from app.services.recipe_service import recipe_service

router = APIRouter(prefix="/recipes", tags=["recipes"])


@router.get("", response_model=list[RecipeSummary])
async def list_recipes(
    ingredient: list[str] = Query(default_factory=list),
    require_all: bool = Query(default=False),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    _ = current_user
    return recipe_service.list_all(selected_ingredients=ingredient, require_all=require_all)


@router.get("/ingredients", response_model=list[str])
async def list_recipe_ingredients(current_user: AuthenticatedUser = Depends(get_current_user)):
    _ = current_user
    return recipe_service.list_ingredients()


@router.get("/match", response_model=RecipeMatchResponse)
async def match_recipes(
    top: int = Query(default=10, ge=1, le=50),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    pantry_count, recommendations = recipe_service.match_for_user(current_user.uid, top=top)
    return RecipeMatchResponse(pantry_count=pantry_count, recommendations=recommendations)


@router.get("/{recipe_id}", response_model=RecipeDetail)
async def get_recipe(recipe_id: str, current_user: AuthenticatedUser = Depends(get_current_user)):
    _ = current_user
    return recipe_service.get_recipe(recipe_id)
