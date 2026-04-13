import httpx

_cache: list[str] | None = None


async def get_mealdb_ingredients() -> list[str]:
    global _cache
    if _cache is not None:
        return _cache

    url = "https://www.themealdb.com/api/json/v1/1/list.php?i=list"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()

    data = resp.json()
    _cache = [
        item["strIngredient"]
        for item in data.get("meals", [])
        if item.get("strIngredient")
    ]
    return _cache
