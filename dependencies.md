# GatorChef — Dependency Guide

Complete guide to all dependencies introduced for the two new features: **ingredient autocomplete** and **GLM-OCR receipt scanning**.

---

## Backend dependencies

### Full `server/requirements.txt` after changes

```
fastapi==0.116.1
uvicorn==0.35.0
firebase-admin==7.1.0
email-validator==2.3.0
httpx>=0.27.0
glmocr>=0.1.0
python-multipart>=0.0.9
```

### New packages

| Package | Why needed | Used by |
|---------|-----------|---------|
| `httpx` | Async HTTP client. Fetches TheMealDB ingredient list at `https://www.themealdb.com/api/json/v1/1/list.php?i=list` | `ingredient_loader.py` |
| `glmocr` | GLM-OCR SDK from Zhipu AI. Provides `parse()` to extract text/structure from receipt images via MaaS (cloud API) | `glm_ocr_service.py` |
| `python-multipart` | Required by FastAPI to parse `multipart/form-data` requests (file uploads). Without it, `UploadFile` endpoints fail with a missing dependency error | `upload.py` |

---

## Frontend dependencies

No new npm packages were added — everything was already in `package.json`.

| Package | Version in package.json | Why used now |
|---------|------------------------|-------------|
| `@radix-ui/react-popover` | v1.1.14 | Powers the autocomplete dropdown in `AutocompleteInput.tsx`. Was installed but unused before this feature. |

---

## External services

| Service | Auth | Used for | Free tier |
|---------|------|---------|----------|
| TheMealDB API | None (no key required) | Canonical ingredient list (~600 names) | Yes — completely free |
| Zhipu MaaS (open.bigmodel.cn) | API key in `glm_ocr_config.yaml` | GLM-OCR receipt scanning | Yes — free tier available |

---

## GLM-OCR cloud account setup

1. Go to https://open.bigmodel.cn
2. Create a free account
3. Navigate to API Keys in the dashboard
4. Generate a new key
5. Add it to `server/app/services/glm_ocr_config.yaml` (this file is gitignored):

```yaml
pipeline:
  maas:
    enabled: true
    api_key: "your-key-here"
```

---

## Installation commands

```bash
# Backend (from repo root)
cd server
pip install -r requirements.txt

# Frontend — no new packages needed
cd client
npm install  # only if node_modules is missing
```

---

## Security notes

- `glm_ocr_config.yaml` is gitignored — never commit it with a real API key.
- TheMealDB requires no credentials — its ingredient list is public data.
- `httpx` replaces any need to use `requests` in async contexts; do not add `requests` back.
