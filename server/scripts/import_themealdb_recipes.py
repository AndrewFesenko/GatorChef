"""Import a local recipe catalog from TheMealDB.

Usage (from server/):
    python scripts/import_themealdb_recipes.py

The script fetches meals by first letter, normalizes the payload into the
backend recipe schema, and writes app/data/themealdb_recipes.json.
"""

from __future__ import annotations

import json
import string
import sys
from pathlib import Path

import httpx

# Allow running from server/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.schemas.recipe import RecipeDetail, RecipeIngredient, RecipeStep

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "app" / "data" / "themealdb_recipes.json"
API_BASE = "https://www.themealdb.com/api/json/v1/1"


def parse_steps(raw: str) -> list[RecipeStep]:
    chunks = [chunk.strip(" -\r\n\t") for chunk in raw.replace("\r", "\n").split("\n") if chunk.strip()]
    if not chunks:
        return []

    return [RecipeStep(step=index, instruction=chunk) for index, chunk in enumerate(chunks, start=1)]


def infer_tags(category: str | None, ingredient_count: int) -> list[str]:
    tags: list[str] = []
    category_lower = (category or "").lower()

    if ingredient_count <= 6 or category_lower in {"breakfast", "starter"}:
        tags.append("quick")
    if category_lower in {"pasta", "vegetarian", "vegan", "breakfast", "side"}:
        tags.append("budget")
    if category_lower in {"salad", "vegetarian", "vegan", "seafood"}:
        tags.append("fresh")

    return tags


def build_ingredients(meal: dict) -> tuple[list[str], list[RecipeIngredient]]:
    ingredient_names: list[str] = []
    ingredient_details: list[RecipeIngredient] = []

    for index in range(1, 21):
        name = (meal.get(f"strIngredient{index}") or "").strip()
        amount = (meal.get(f"strMeasure{index}") or "").strip()
        if not name:
            continue
        ingredient_names.append(name)
        ingredient_details.append(RecipeIngredient(name=name, amount=amount))

    return ingredient_names, ingredient_details


def build_recipe(meal: dict) -> RecipeDetail:
    ingredients, ingredient_details = build_ingredients(meal)
    category = meal.get("strCategory") or None
    area = meal.get("strArea") or None
    tags = infer_tags(category, len(ingredients))
    raw_tags = meal.get("strTags") or ""
    for tag in [item.strip().lower() for item in raw_tags.split(",") if item.strip()]:
        if tag not in tags:
            tags.append(tag)

    desc_parts = [part for part in [area, category] if part]
    desc = " - ".join(desc_parts) if desc_parts else "Imported from TheMealDB"

    return RecipeDetail(
        id=f"themealdb-{meal['idMeal']}",
        title=meal["strMeal"].strip(),
        desc=desc,
        time="Varies",
        servings=2,
        difficulty="Medium",
        tags=tags,
        ingredients=ingredients,
        ingredient_details=ingredient_details,
        steps=parse_steps(meal.get("strInstructions") or ""),
        tips=[],
        image_url=meal.get("strMealThumb") or None,
        category=category,
        area=area,
        source_url=meal.get("strSource") or None,
        youtube_url=meal.get("strYoutube") or None,
    )


def fetch_all_meals() -> list[RecipeDetail]:
    meals_by_id: dict[str, RecipeDetail] = {}
    with httpx.Client(timeout=20) as client:
        for letter in string.ascii_lowercase:
            response = client.get(f"{API_BASE}/search.php?f={letter}")
            response.raise_for_status()
            payload = response.json()
            for meal in payload.get("meals") or []:
                recipe = build_recipe(meal)
                meals_by_id[recipe.id] = recipe
            print(f"Fetched letter {letter.upper()}: {len(payload.get('meals') or [])} meals")

    return sorted(meals_by_id.values(), key=lambda meal: meal.title.lower())


def main() -> None:
    recipes = fetch_all_meals()
    OUTPUT_PATH.write_text(
        json.dumps([recipe.model_dump(mode="json") for recipe in recipes], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Wrote {len(recipes)} recipes to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
