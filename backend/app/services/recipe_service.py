# TODO Phase 4: Recipe matching service
#
# External API: TheMealDB (free, no key needed)
#   - Search by ingredient: GET /filter.php?i={ingredient}
#   - Recipe details:       GET /lookup.php?i={idMeal}
#
# def fetch_recipes_by_ingredient(ingredient: str) -> list[dict]
# def fetch_recipe_details(id_meal: str) -> dict
#     Cache in Firestore cached_recipes/{idMeal} with 24h TTL
#
# def match_recipes(pantry_items: list[PantryItem], top: int = 5) -> list[RecipeMatch]:
#     1. For top ~10 pantry items, gather candidate recipe IDs
#     2. Fetch details for each candidate
#     3. Normalize recipe ingredients through same normalizer
#     4. Score: |matched| / |total_ingredients|, penalize if total > 9
#     5. Return top N sorted by score with matched/missing lists
#
# Dependencies: httpx, app.services.normalizer
