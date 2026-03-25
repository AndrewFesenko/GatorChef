import httpx
from rapidfuzz import process, fuzz

_MEALDB_INGREDIENTS: list[str] | None = None

# Normalizer works with the mealDB API TO normalize the receipt items to normal names, this was said to be done by AI and it provided this as an example 
# not SURE IF NEEDED AND notcompletely necesarry in services-update-branch version1

# Common receipt abbreviations → real words
_ABBREVIATIONS: dict[str, str] = {
    "chkn": "chicken",
    "chk": "chicken",
    "brst": "breast",
    "brsts": "breasts",
    "bnls": "boneless",
    "sknls": "skinless",
    "grn": "green",
    "org": "organic",
    "whl": "whole",
    "wht": "white",
    "brn": "brown",
    "frz": "frozen",
    "frzn": "frozen",
    "veg": "vegetable",
    "vegs": "vegetables",
    "pep": "pepper",
    "tom": "tomato",
    "pot": "potato",
    "swt": "sweet",
    "crm": "cream",
    "chz": "cheese",
    "bf": "beef",
    "grd": "ground",
    "grnd": "ground",
    "pk": "pork",
    "turk": "turkey",
    "salm": "salmon",
    "shmp": "shrimp",
    "lett": "lettuce",
    "onio": "onion",
    "gar": "garlic",
    "mush": "mushroom",
    "mus": "mushroom",
    "spin": "spinach",
    "broc": "broccoli",
    "cucu": "cucumber",
    "zuc": "zucchini",
    "cran": "cranberry",
    "straw": "strawberry",
    "blueb": "blueberry",
    "raspb": "raspberry",
}

# Brand-like words to strip
_BRAND_WORDS = {
    "great", "value", "market", "pantry", "brand", "premium", "select",
    "choice", "fresh", "farm", "natural", "simply", "best", "signature",
    "kirkland", "generic", "store",
}


# def _load_mealdb_ingredients() -> list[str]:
#     global _MEALDB_INGREDIENTS
#     if _MEALDB_INGREDIENTS is not None:
#         return _MEALDB_INGREDIENTS

#     url = "https://www.themealdb.com/api/json/v1/1/list.php?i=list"
#     resp = httpx.get(url, timeout=10)
#     resp.raise_for_status()
#     data = resp.json()

#     _MEALDB_INGREDIENTS = [
#         item["strIngredient"].lower()
#         for item in data.get("meals", [])
#         if item.get("strIngredient")
#     ]
#     return _MEALDB_INGREDIENTS


# def _expand_abbreviations(text: str) -> str:
#     words = text.split()
#     expanded = [_ABBREVIATIONS.get(w, w) for w in words]
#     return " ".join(expanded)


# def _remove_brand_words(text: str) -> str:
#     words = text.split()
#     filtered = [w for w in words if w not in _BRAND_WORDS]
#     return " ".join(filtered) if filtered else text


# def normalize(item_name: str) -> str:
#     """Normalize a receipt item name to a known ingredient via fuzzy matching."""
#     cleaned = item_name.lower().strip()
#     cleaned = _expand_abbreviations(cleaned)
#     cleaned = _remove_brand_words(cleaned)

#     if not cleaned:
#         return item_name.lower().strip()

#     ingredients = _load_mealdb_ingredients()
#     result = process.extractOne(
#         cleaned, ingredients, scorer=fuzz.token_sort_ratio, score_cutoff=70
#     )

#     if result:
#         match, score, _ = result
#         return match

#     return cleaned
