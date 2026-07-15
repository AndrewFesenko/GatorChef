from __future__ import annotations

import json
import re
from pathlib import Path

from fastapi import HTTPException, status

from app.schemas.recipe import RecipeDetail, RecipeIngredient, RecipeMatch, RecipeStep, RecipeSummary
from app.services.pantry_service import pantry_service

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "themealdb_recipes.json"

_fallback_catalog: list[RecipeDetail] = [
    RecipeDetail(
        id="fallback-rice-and-beans",
        title="Rice & Beans Bowl",
        desc="High protein, low effort, and easy to stretch for leftovers.",
        time="15 min",
        servings=2,
        difficulty="Easy",
        tags=["budget"],
        ingredients=["white rice", "black beans", "garlic", "olive oil", "cumin", "salt", "pepper", "lime", "cilantro"],
        ingredient_details=[
            RecipeIngredient(name="White rice", amount="1 cup"),
            RecipeIngredient(name="Black beans", amount="1 can (15 oz)"),
            RecipeIngredient(name="Garlic", amount="2 cloves"),
            RecipeIngredient(name="Olive oil", amount="1 tbsp"),
        ],
        steps=[
            RecipeStep(step=1, instruction="Cook the rice according to package instructions."),
            RecipeStep(step=2, instruction="Warm the beans with garlic, olive oil, cumin, salt, and pepper."),
            RecipeStep(step=3, instruction="Serve the beans over rice and finish with lime or cilantro if available."),
        ],
        tips=["Top it with a fried egg for extra protein."],
        category="Vegetarian",
        area="Global",
    ),
    RecipeDetail(
        id="fallback-garlic-butter-pasta",
        title="Garlic Butter Pasta",
        desc="Creamy, fast, and built for a low-effort weeknight.",
        time="20 min",
        servings=2,
        difficulty="Easy",
        tags=["quick", "budget"],
        ingredients=["pasta", "butter", "garlic", "parmesan", "salt", "black pepper", "parsley"],
        ingredient_details=[
            RecipeIngredient(name="Pasta", amount="8 oz"),
            RecipeIngredient(name="Butter", amount="3 tbsp"),
            RecipeIngredient(name="Garlic", amount="4 cloves"),
            RecipeIngredient(name="Parmesan", amount="1/3 cup"),
        ],
        steps=[
            RecipeStep(step=1, instruction="Cook the pasta until al dente and reserve some pasta water."),
            RecipeStep(step=2, instruction="Melt butter and cook garlic until fragrant."),
            RecipeStep(step=3, instruction="Toss the pasta with butter, garlic, Parmesan, and pasta water."),
        ],
        tips=["Add red pepper flakes if you want heat."],
        category="Pasta",
        area="Italian",
    ),
]


def _normalize_ingredient(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9\s]", " ", value.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    synonyms = {
        "egg": "eggs",
        "white rice": "rice",
        "cooked rice": "rice",
        "olive oil": "oil",
        "pepper": "black pepper",
        "bell peppers": "bell pepper",
        "tomato": "tomatoes",
        "green onions": "green onion",
        "scallions": "green onion",
    }
    return synonyms.get(normalized, normalized)


def _to_summary(recipe: RecipeDetail) -> RecipeSummary:
    return RecipeSummary(
        id=recipe.id,
        title=recipe.title,
        desc=recipe.desc,
        time=recipe.time,
        servings=recipe.servings,
        difficulty=recipe.difficulty,
        tags=recipe.tags,
        ingredients=recipe.ingredients,
        image_url=recipe.image_url,
        category=recipe.category,
        area=recipe.area,
    )


class RecipeService:
    def __init__(self) -> None:
        self._cache: list[RecipeDetail] | None = None

    def _load_catalog(self) -> list[RecipeDetail]:
        if self._cache is not None:
            return self._cache

        if DATA_PATH.exists():
            try:
                payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
                if isinstance(payload, list):
                    self._cache = [RecipeDetail.model_validate(item) for item in payload]
                    return self._cache
            except Exception:
                pass

        self._cache = list(_fallback_catalog)
        return self._cache

    def reload_catalog(self) -> list[RecipeDetail]:
        self._cache = None
        return self._load_catalog()

    def list_all(self, selected_ingredients: list[str] | None = None, require_all: bool = False) -> list[RecipeSummary]:
        normalized_selected = {_normalize_ingredient(item) for item in (selected_ingredients or []) if item.strip()}
        recipes = self._load_catalog()

        if not normalized_selected:
            return [_to_summary(recipe) for recipe in recipes]

        filtered: list[RecipeSummary] = []
        for recipe in recipes:
            recipe_ingredients = {_normalize_ingredient(item) for item in recipe.ingredients}
            if require_all:
                if normalized_selected.issubset(recipe_ingredients):
                    filtered.append(_to_summary(recipe))
            elif recipe_ingredients.intersection(normalized_selected):
                filtered.append(_to_summary(recipe))

        return sorted(filtered, key=lambda recipe: recipe.title.lower())

    def list_ingredients(self) -> list[str]:
        recipes = self._load_catalog()
        ingredients = sorted({ingredient for recipe in recipes for ingredient in recipe.ingredients}, key=str.lower)
        return list(ingredients)

    def get_recipe(self, recipe_id: str) -> RecipeDetail:
        recipes = self._load_catalog()
        for recipe in recipes:
            if recipe.id == recipe_id:
                return recipe
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Recipe '{recipe_id}' not found")

    def match_for_user(self, user_id: str, top: int = 10) -> tuple[int, list[RecipeMatch]]:
        pantry_items = pantry_service.list_items(user_id)
        pantry_names = {_normalize_ingredient(item.name) for item in pantry_items if item.name.strip()}
        pantry_count = len(pantry_names)
        if pantry_count == 0:
            return 0, []

        matches: list[RecipeMatch] = []
        for recipe in self._load_catalog():
            normalized_recipe_ingredients = [_normalize_ingredient(item) for item in recipe.ingredients]
            matched = [
                ingredient for ingredient, normalized in zip(recipe.ingredients, normalized_recipe_ingredients, strict=False)
                if normalized in pantry_names
            ]
            if not matched:
                continue

            missing = [
                ingredient for ingredient, normalized in zip(recipe.ingredients, normalized_recipe_ingredients, strict=False)
                if normalized not in pantry_names
            ]
            score = len(matched) / len(recipe.ingredients) if recipe.ingredients else 0
            summary = _to_summary(recipe)
            matches.append(
                RecipeMatch(
                    **summary.model_dump(),
                    score=score,
                    match_count=len(matched),
                    match_percent=round(score * 100),
                    matched_ingredients=matched,
                    missing_ingredients=missing,
                )
            )

        matches.sort(key=lambda recipe: (-recipe.match_count, -recipe.match_percent, recipe.title.lower()))
        return pantry_count, matches[:top]


recipe_service = RecipeService()
