# GLM-OCR Call Method Reference

**Project:** GatorChef (FastAPI + React pantry app)
**File:** `server/app/services/glm_ocr_service.py`
**Endpoint:** `POST /upload/receipt`

---

## Overview

This document is a technical reference for how GLM-OCR ingredient extraction works in GatorChef — the call method, prompt design, where it is called, what it returns, and how dependencies fit together.

---

## The Service: `glm_ocr_service.py`

### Function Signature

```python
async def extract_ingredients(image_bytes: bytes) -> list[str]
```

### Full Implementation

```python
async def extract_ingredients(image_bytes: bytes) -> list[str]:
    """Send a receipt image to GLM-OCR (MaaS) and return canonical ingredient names."""
    canonical = await get_mealdb_ingredients()  # ~600 TheMealDB names, cached
    canonical_set = set(canonical)

    from glmocr import parse as glm_parse  # lazy import — fails loud if not installed

    # glmocr.parse() expects a file path, so we write to a temp file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name

    try:
        prompt = _INGREDIENT_PROMPT.format(ingredients=json.dumps(canonical))
        result = glm_parse(tmp_path, config=_CONFIG_PATH, prompt=prompt)
    finally:
        Path(tmp_path).unlink(missing_ok=True)  # always clean up

    names = _parse_result(result)
    return [n for n in names if n in canonical_set]  # hard-filter to canonical names only
```

### Execution Flow

```
extract_ingredients(image_bytes)
        |
        |-- get_mealdb_ingredients()       [async, cached]
        |       Returns ~600 canonical names from TheMealDB
        |
        |-- tempfile.NamedTemporaryFile()  [write image bytes to disk]
        |       glmocr.parse() requires a file path, not raw bytes
        |
        |-- _INGREDIENT_PROMPT.format()    [inject canonical list into prompt]
        |
        |-- glm_parse(tmp_path, config, prompt)   [MaaS API call → Zhipu servers]
        |
        |-- Path(tmp_path).unlink()        [always runs — finally block]
        |
        |-- _parse_result(result)          [extract JSON array from response]
        |
        v
[n for n in names if n in canonical_set]  [hard-filter: only known ingredients]
        |
        v
list[str]  e.g. ["Chicken Breast", "Garlic", "Olive Oil"]
```

---

## The Prompt

### Template

```
"You are a grocery receipt parser. Extract every food/ingredient item from this receipt.
Map each item to the CLOSEST match from this canonical ingredient list:
{ingredients}

Ignore prices, quantities, store info, tax lines, barcodes, and non-food items.
Return ONLY a JSON array of strings. Example: ["Chicken Breast", "Garlic", "Olive Oil"]"
```

At call time, `{ingredients}` is replaced with `json.dumps(canonical)` — the full ~600-item TheMealDB list embedded directly in the prompt.

### Why This Prompt Design Works

| Design choice | Reason |
|---------------|--------|
| Canonical list embedded in prompt | Constrains model output to known ingredient names — prevents free-form hallucination |
| "CLOSEST match" language | Handles store abbreviations (BNLS CHKN BRST → Chicken Breast), brand names, and misspellings |
| Explicit exclusion list | Prevents prices, store names, tax lines, and barcodes from appearing in the output |
| JSON array response format | Structured and parseable — no ambiguity, no free-text cleanup needed |
| No few-shot examples beyond the inline one | Keeps prompt concise; the canonical list itself is the primary constraint |

---

## The Config

### Config File Format

```yaml
# server/app/services/glm_ocr_config.yaml
pipeline:
  maas:
    enabled: true
    api_key: "your-zhipu-api-key"
```

### Path Resolution

```
GLM_OCR_CONFIG env var
        |
        | (if not set)
        v
server/app/services/glm_ocr_config.yaml   (default path)
```

This file is gitignored. Never commit it. Get an API key at https://open.bigmodel.cn (free tier available).

To use a custom config path:
```bash
export GLM_OCR_CONFIG=/path/to/your/glm_ocr_config.yaml
```

---

## Where It's Called

**File:** `server/app/routes/upload.py`
**Endpoint:** `POST /upload/receipt`

```python
@router.post("/receipt", response_model=ReceiptUploadResponse)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    image_bytes = await file.read()
    if len(image_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    names = await extract_ingredients(image_bytes)  # <-- THE CALL

    # Write each canonical name to Firestore
    for name in names:
        doc_ref = pantry_ref.document()
        doc_ref.set({"name": name, "category": "Produce", "expiry": "unknown"})
```

### Auth Pattern

The upload route uses the same authentication pattern as `pantry.py`:

```python
from app.dependencies.auth import AuthenticatedUser, get_current_user
```

The old broken import (`from app.deps import verify_firebase_token`) has been removed.

### Request Format

Multipart form data:

```bash
curl -X POST http://localhost:8000/upload/receipt \
  -H "Authorization: Bearer <firebase-id-token>" \
  -F "file=@receipt.jpg"
```

---

## What It Returns

### Success

`list[str]` — canonical TheMealDB ingredient names only:

```python
["Chicken Breast", "Garlic", "Olive Oil", "Tomatoes"]
```

### Empty Result

`[]` — returned when:
- The receipt contains no recognizable food items
- The model returns a response that cannot be parsed as a JSON array
- All extracted names fail the canonical_set filter

The endpoint treats an empty list as a valid successful response (not an error).

---

## Result Parsing: `_parse_result()`

The GLM-OCR model response may or may not be wrapped in markdown code fences. `_parse_result()` normalizes the response robustly:

```
GLM-OCR result object
        |
        v
Extract text: result.text  OR  result.to_text()
        |
        v
Strip markdown code fences if present:
    ```json ... ```  →  raw JSON string
        |
        v
json.loads(cleaned_string)
        |
        v
Filter: keep only non-empty string items
        |
        v
On ANY parse error at any step → return []
```

This means the service degrades gracefully — a malformed or unexpected model response never raises an unhandled exception.

---

## Shared Dependency: `ingredient_loader.py`

`extract_ingredients()` calls `get_mealdb_ingredients()` from `ingredient_loader.py` to retrieve the canonical ingredient list.

```
ingredient_loader.get_mealdb_ingredients()
        |
        |-- Fetches from TheMealDB API (httpx async)
        |-- Caches result in memory after first fetch
        |
        v
~600 canonical ingredient name strings
```

This same function is the data source for the `GET /ingredients` endpoint used by the frontend autocomplete feature. One fetch, one cache, two consumers:

```
get_mealdb_ingredients()
    |                   |
    v                   v
GLM-OCR prompt    GET /ingredients
(receipt upload)  (autocomplete UI)
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `glmocr` | `>=0.1.0` | GLM-OCR SDK — the `parse()` function that sends image + prompt to Zhipu MaaS |
| `httpx` | `>=0.27.0` | Async HTTP client used by `ingredient_loader.py` to fetch from TheMealDB API |
| `python-multipart` | `>=0.0.9` | Required by FastAPI to accept `UploadFile` in multipart form data |

Install:

```bash
pip install glmocr httpx python-multipart
```

Or:

```bash
pip install -r server/requirements.txt
```

---

## Error Handling

| Failure scenario | HTTP status | Behavior |
|-----------------|-------------|----------|
| `glmocr` package not installed (`ImportError`) | 503 Service Unavailable | Fails loud on lazy import — tells the developer exactly what to install |
| `tempfile` write failure (disk full, permissions) | 500 Internal Server Error | Propagates — no silent failure |
| GLM-OCR MaaS API error (bad key, quota exceeded, Zhipu outage) | 500 Internal Server Error | Propagates — check Zhipu dashboard |
| JSON parse failure on model response | No error — returns `[]` | Graceful degradation — empty pantry write, no crash |
| TheMealDB API down (`ingredient_loader` failure) | 502 Bad Gateway | Propagates — canonical list is required to build the prompt |
| File too large (>10MB) | 413 Request Entity Too Large | Caught in upload route before `extract_ingredients` is called |
| Missing or invalid Firebase token | 401 Unauthorized | Caught by `get_current_user` dependency before route body runs |

### Error Handling Flow

```
POST /upload/receipt
        |
        |-- Auth check (get_current_user) → 401 if token invalid
        |
        |-- File size check → 413 if > 10MB
        |
        |-- extract_ingredients()
                |
                |-- get_mealdb_ingredients() → 502 if TheMealDB unreachable
                |
                |-- import glmocr → 503 if not installed
                |
                |-- tempfile write → 500 if disk error
                |
                |-- glm_parse() → 500 if MaaS API error
                |
                |-- _parse_result() → [] if response unparseable (no error raised)
                |
                |-- canonical_set filter → [] if no matches (no error raised)
```
