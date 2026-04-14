# OCR Upgrade: Google Cloud Vision → GLM-OCR

**Project:** GatorChef (FastAPI + React pantry app)
**Scope:** Receipt scanning pipeline replacement

---

## Overview

This document describes the plan-of-action for replacing the Google Cloud Vision OCR pipeline with GLM-OCR for receipt ingredient extraction. The old three-stage approach (OCR → regex parse → fuzzy normalize) is replaced by a single multimodal model call that handles all three responsibilities at once.

---

## Current State (Before Upgrade)

### Service Files (in `backend/` — prototype only, NOT imported by running server)

```
backend/app/services/
    ocr_service.py        — Google Cloud Vision text extraction
    receipt_parser.py     — regex-based line cleaning
    normalizer.py         — abbreviation expansion + fuzzy matching (ENTIRELY COMMENTED OUT)
```

> **Important:** The `backend/` directory is prototype code. It is NOT imported by the running server at `server/`. The upload route previously referenced server-side services that did not exist.

### Old Pipeline

```
Receipt image (bytes)
        |
        v
ocr_service.extract_text(image_bytes)
    [Google Cloud Vision client.text_detection()]
    Returns: raw concatenated OCR string
        |
        v
receipt_parser.parse(raw_text)
    [regex strips prices, SKUs, barcodes, junk lines]
    Returns: list[str] of cleaned line strings
        |
        v
[normalizer.normalize(name) for name in parsed_names]
    [~52 hardcoded abbreviations, brand stripping, rapidfuzz vs TheMealDB]
    Score cutoff: 70, token_sort_ratio
    STATUS: ENTIRELY COMMENTED OUT — never ran in production
        |
        v
Pantry write
```

### upload.py (old)

Called the pipeline as:
```python
ocr_service.extract_text(image_bytes)
    → receipt_parser.parse(raw_text)
    → [normalizer.normalize(name) for name in parsed_names]
```

Also used a broken import path: `from app.deps import verify_firebase_token` (wrong module for `server/`).

---

## Problems With the Old Approach

| # | Problem |
|---|---------|
| 1 | Abbreviation dictionary too small (~52 entries) — receipts use hundreds of store-specific abbreviations |
| 2 | `normalizer.py` entirely commented out — normalization was never active in production |
| 3 | Regex receipt parser cannot handle complex layouts, multi-column receipts, or handwritten items |
| 4 | Google Cloud Vision returns raw text with no semantic understanding of food vs. SKU |
| 5 | No multilingual support — "pollo" stays "pollo" with no mapping to "Chicken" |
| 6 | rapidfuzz cutoff of 70 causes both false positives (junk matched) and false negatives (real items missed) |

---

## New Approach: GLM-OCR Single-Pass

### What is GLM-OCR?

GLM-OCR is a 0.9B-parameter multimodal model specialized for document understanding. It is accessed via the Zhipu MaaS cloud API — no local GPU is required. The model understands image content directly and can reason about structured documents like receipts.

### Why Single-Pass?

Instead of chaining three fragile steps, one model call:

- Receives the receipt image plus TheMealDB's ~600 canonical ingredient names as prompt context
- Returns canonical ingredient names directly, constrained to the provided list
- Handles abbreviations, multilingual text, multi-column layouts, and store jargon natively

This eliminates the abbreviation dictionary problem, the broken normalizer, and the regex parser in one move.

---

## New Pipeline

```
Receipt image (bytes)
        |
        v
glm_ocr_service.extract_ingredients(image_bytes)
        |
        |-- writes image to temp file
        |-- loads ~600 TheMealDB canonical names (cached)
        |-- builds prompt with canonical list embedded
        |
        v
GLM-OCR MaaS (Zhipu servers, glm-4v model)
        |
        v
Parse JSON array response
        |
        v
Filter: keep only names present in canonical_set
        |
        v
Firestore: users/{uid}/pantry/{doc_id}
    { name: "Chicken Breast", category: "Produce", expiry: "unknown" }
```

---

## Files Changed in This Upgrade

| File | Action | Reason |
|------|--------|--------|
| `server/app/services/glm_ocr_service.py` | NEW | Replaces all 3 old services in one file |
| `server/app/services/ingredient_loader.py` | NEW | Shared TheMealDB ingredient list for OCR prompt and autocomplete |
| `server/app/routes/upload.py` | REWRITTEN | Auth pattern fixed, new single-call pipeline |
| `server/app/main.py` | MODIFIED | Upload router now registered |
| `server/requirements.txt` | MODIFIED | Added `glmocr`, `httpx`, `python-multipart` |
| `backend/app/services/ocr_service.py` | DEPRECATED | Google Vision no longer used |
| `backend/app/services/receipt_parser.py` | DEPRECATED | Regex parsing replaced by GLM-OCR |
| `backend/app/services/normalizer.py` | DEPRECATED | Fuzzy matching replaced by GLM-OCR |

---

## Auth Fix in upload.py

The old upload route used:
```python
from app.deps import verify_firebase_token  # wrong module path for server/
```

Rewritten to match the pattern used in `pantry.py`:
```python
from app.dependencies.auth import AuthenticatedUser, get_current_user
```

---

## Config Setup (Required Before First Run)

GLM-OCR requires a `config.yaml` file containing your Zhipu API key.

**File location:** `server/app/services/glm_ocr_config.yaml`
**This file is gitignored — never commit it.**

```yaml
# server/app/services/glm_ocr_config.yaml
pipeline:
  maas:
    enabled: true
    api_key: "your-key-from-open.bigmodel.cn"
```

To override the config path, set the `GLM_OCR_CONFIG` environment variable:

```bash
export GLM_OCR_CONFIG=/path/to/your/glm_ocr_config.yaml
```

Get a free API key at: https://open.bigmodel.cn

---

## Dependencies

Install the new dependencies:

```bash
pip install glmocr httpx python-multipart
```

Or via requirements file:

```bash
pip install -r server/requirements.txt
```

| Package | Purpose |
|---------|---------|
| `glmocr` | GLM-OCR SDK — the `parse()` function that calls Zhipu MaaS |
| `httpx` | Async HTTP client used by `ingredient_loader.py` to fetch TheMealDB |
| `python-multipart` | Required by FastAPI to accept `UploadFile` in form data |

---

## Testing the Upgrade

### Step-by-step

1. Obtain a Zhipu API key from https://open.bigmodel.cn (free tier available)

2. Create the config file:
   ```bash
   # server/app/services/glm_ocr_config.yaml
   pipeline:
     maas:
       enabled: true
       api_key: "YOUR_KEY_HERE"
   ```

3. Install dependencies:
   ```bash
   pip install -r server/requirements.txt
   ```

4. Start the server:
   ```bash
   cd server
   uvicorn app.main:app --reload
   ```

5. Upload a receipt via the endpoint:
   ```bash
   curl -X POST http://localhost:8000/upload/receipt \
     -H "Authorization: Bearer <firebase-id-token>" \
     -F "file=@receipt.jpg"
   ```

6. Verify the response:
   - Response body should contain `parsed_items` with canonical TheMealDB names
   - Example: `{"parsed_items": ["Chicken Breast", "Garlic", "Olive Oil"]}`

7. Verify Firestore:
   - Open Firebase Console → Firestore
   - Check `users/{uid}/pantry/` for newly created documents

### Edge Case Tests

| Test case | Expected behavior |
|-----------|------------------|
| Blurry or low-resolution receipt | Returns `[]` or partial list gracefully |
| Receipt with only non-food items (e.g., cleaning supplies) | Returns `[]` |
| Spanish-language receipt (e.g., "pollo asado") | Maps to "Chicken" via GLM-OCR semantic understanding |
| Receipt with store abbreviations (e.g., "BNLS CHKN BRST") | Maps to "Chicken Breast" |
| File larger than 10MB | Returns HTTP 413 |
| Missing or expired Firebase token | Returns HTTP 401 |

---

## What Was Removed

The following files are deprecated and no longer part of the active pipeline. They remain in `backend/` as historical reference but should not be imported:

- `backend/app/services/ocr_service.py` — Google Cloud Vision `client.text_detection()`
- `backend/app/services/receipt_parser.py` — regex price/SKU/barcode stripping
- `backend/app/services/normalizer.py` — ~52-entry abbreviation dict + rapidfuzz (was commented out entirely)
