import json
import os
import tempfile
from pathlib import Path

from fastapi import HTTPException, status

from app.services.ingredient_loader import get_mealdb_ingredients

# Path to glmocr config.yaml — set GLM_OCR_CONFIG env var or place config.yaml
# next to this file. The config tells the SDK to use MaaS (cloud) mode:
#
#   pipeline:
#     maas:
#       enabled: true
#       api_key: <your Zhipu API key from open.bigmodel.cn>
#
_CONFIG_PATH = os.getenv(
    "GLM_OCR_CONFIG",
    str(Path(__file__).parent / "glm_ocr_config.yaml"),
)

_INGREDIENT_PROMPT = (
    "You are a grocery receipt parser. Extract every food/ingredient item from this receipt. "
    "Map each item to the CLOSEST match from this canonical ingredient list:\n"
    "{ingredients}\n\n"
    "Ignore prices, quantities, store info, tax lines, barcodes, and non-food items. "
    'Return ONLY a JSON array of strings. Example: ["Chicken Breast", "Garlic", "Olive Oil"]'
)


async def extract_ingredients(image_bytes: bytes) -> list[str]:
    """Send a receipt image to GLM-OCR (MaaS) and return canonical ingredient names."""
    canonical = await get_mealdb_ingredients()
    canonical_set = set(canonical)

    try:
        from glmocr import parse as glm_parse
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="glmocr package is not installed. Run: pip install glmocr",
        ) from exc

    # glmocr.parse() expects a file path
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        prompt = _INGREDIENT_PROMPT.format(ingredients=json.dumps(canonical))
        result = glm_parse(tmp_path, config=_CONFIG_PATH, prompt=prompt)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    names = _parse_result(result)
    # Filter to only canonical names the recipe engine knows
    return [n for n in names if n in canonical_set]


def _parse_result(result) -> list[str]:
    """Extract a list of strings from GLM-OCR's result object."""
    # Try to get structured/text output
    raw = None
    if hasattr(result, "text"):
        raw = result.text
    elif hasattr(result, "to_text"):
        raw = result.to_text()
    else:
        raw = str(result)

    if not raw:
        return []

    # Strip markdown code fences if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if item]
    except (json.JSONDecodeError, ValueError):
        pass

    return []
git 