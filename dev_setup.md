# GatorChef — Local Development Setup

Complete guide for setting up and testing the two new features: **ingredient autocomplete** and **GLM-OCR receipt scanning**. A developer joining the project or picking up after a gap should be able to follow this from scratch.

---

## What was built

Two independent features that share a common data foundation:

1. **Ingredient Autocomplete** — The Pantry page now has a Google-style dropdown that suggests TheMealDB canonical ingredient names as you type. Ensures consistent naming for recipe matching.
   - Backend: `GET /ingredients` endpoint
   - Frontend: `AutocompleteInput` component + `useMealDbIngredients` hook

2. **GLM-OCR Receipt Scanning** — Receipt image upload now uses GLM-OCR (Zhipu MaaS) instead of Google Cloud Vision. Single-pass: the model reads the receipt and normalizes ingredient names to TheMealDB canonical form in one API call. Replaces the old 3-step pipeline (OCR → regex parse → fuzzy normalize).

### Shared foundation

Both features use `server/app/services/ingredient_loader.py`, which fetches and caches the TheMealDB ingredient list. One cached list, two consumers.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────┐
│                    GatorChef Backend                     │
│                                                         │
│  GET /ingredients ──→ ingredient_loader ──→ TheMealDB   │
│                              │                          │
│  POST /upload/receipt ──→ glm_ocr_service               │
│                              │ (uses ingredient list    │
│                              │  as prompt context)      │
│                              └──→ Zhipu MaaS (GLM-OCR)  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   GatorChef Frontend                    │
│                                                         │
│  Pantry page                                            │
│    ├── useMealDbIngredients() ──→ GET /ingredients      │
│    └── AutocompleteInput (Radix Popover)                │
│         ├── Add BottomSheet                             │
│         └── Edit BottomSheet                            │
└─────────────────────────────────────────────────────────┘
```

---

## New files at a glance

```
server/
  app/
    routes/
      ingredients.py          ← GET /ingredients endpoint
      upload.py               ← POST /upload/receipt (rewritten)
    services/
      ingredient_loader.py    ← shared TheMealDB cache
      glm_ocr_service.py      ← GLM-OCR extraction logic
      glm_ocr_config.yaml     ← GITIGNORED — your API key goes here

client/
  src/
    components/
      AutocompleteInput.tsx   ← Radix Popover combobox component
    hooks/
      useMealDbIngredients.ts ← fetch + cache hook
    pages/
      Pantry.tsx              ← modified to use AutocompleteInput
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Firebase service account JSON (for Firestore auth) — in `secret/` folder or via `GOOGLE_APPLICATION_CREDENTIALS` env var
- Zhipu API key (free from https://open.bigmodel.cn) — required only for GLM-OCR receipt scanning

---

## Step-by-step local setup

### 1. Clone and install

```bash
git clone <repo-url>
cd repo-b

# Backend
cd server
pip install -r requirements.txt
cd ..

# Frontend
cd client
npm install
cd ..
```

### 2. Configure GLM-OCR (for receipt scanning only)

Create `server/app/services/glm_ocr_config.yaml` (this file is gitignored):

```yaml
pipeline:
  maas:
    enabled: true
    api_key: "your-zhipu-api-key"
```

Get your key at https://open.bigmodel.cn → API Keys.

Alternatively, point the env var `GLM_OCR_CONFIG` to a config file elsewhere:

```bash
export GLM_OCR_CONFIG=/path/to/my_config.yaml
```

### 3. Frontend Firebase config (client/.env)

The frontend needs Firebase credentials to handle user login. Create `client/.env` by copying `.env.example`:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

ALL OF THESE MAP
  firebaseConfig.apiKey            → VITE_FIREBASE_API_KEY
  firebaseConfig.authDomain        → VITE_FIREBASE_AUTH_DOMAIN
  firebaseConfig.projectId         → VITE_FIREBASE_PROJECT_ID
  firebaseConfig.storageBucket     → VITE_FIREBASE_STORAGE_BUCKET
  firebaseConfig.messagingSenderId → VITE_FIREBASE_MESSAGING_SENDER_ID
  firebaseConfig.appId             → VITE_FIREBASE_APP_ID

**Where to get these values:** Firebase Console → your project → **Project Settings** (gear icon) → **General** → scroll to **Your apps** → select the web app → **SDK setup and configuration** → copy the `firebaseConfig` object. Each field maps directly to a `VITE_FIREBASE_*` var.

> **These values are NOT secret.** Unlike the backend service account JSON, these are public client-side identifiers — safe to put in `.env`. Firebase security is enforced by Auth rules and Firestore rules, not by hiding these values.

After creating `client/.env`, restart Vite (`CTRL+C` then `npm run dev`) — it only reads `.env` on startup.

### 4. Backend Firebase credentials (service account)

The backend needs a Firebase service account JSON to verify auth tokens and write to Firestore. This IS a private key — keep it out of git.

Place the JSON file in the project `secret/` folder (`gatorchef/secret/`), or set the env var.

If you want to use a backend `.env` file, create `server/.env` and add:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\alejm\Downloads\gatorchef-c7c69-firebase-adminsdk-fbsvc-791b86a30d.json
```

Then start the backend from the `server` folder.

Alternatively, set the env var directly:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

**Where to get this:** Firebase Console → Project Settings → **Service accounts** tab → **Generate new private key** → download the JSON.

### 5. Start both servers

```bash
# Terminal 1 — Backend
cd server
uvicorn app.main:app --reload --port 8000

"NOTE:

If that still fails after installing, use the module form which always works:

python -m uvicorn app.main:app --reload --port 8000"

# Terminal 2 — Frontend
cd client
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

---

## Testing the autocomplete feature

1. Open the app at http://localhost:8080 and log in.
2. Navigate to Pantry.
3. Tap the "+" button to open Add Ingredient.
4. Start typing `chick` — a dropdown appears with Chicken, Chicken Breast, Chicken Thighs, etc.
5. Use arrow keys or click to select an item.
6. Press Enter or tap "Add to Pantry".
7. Verify in Firestore: the item name matches the exact TheMealDB casing.

### Verifying the `/ingredients` endpoint directly

```bash
curl http://localhost:8000/ingredients
# Returns: ["Chicken", "Chicken Breast", "Garlic", ...]
# ~600 items, no auth required
```

### If the dropdown does not appear

- Check the browser console for a "Failed to load ingredient suggestions" warning.
- Verify `GET http://localhost:8000/ingredients` returns a JSON array.
- Confirm `ingredient_loader` can reach TheMealDB (check server logs for network errors).

---

## Testing GLM-OCR receipt scanning

1. Ensure `glm_ocr_config.yaml` exists and has a valid API key.
2. Log in to the app.
3. Use the scan button (barcode icon) on the Pantry page.
4. Upload a receipt image (JPEG or PNG, max 10 MB).
5. Verify that items appear in the pantry with canonical TheMealDB names.

### API test via curl

Get a Firebase ID token first, then:

```bash
curl -X POST http://localhost:8000/upload/receipt \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -F "file=@/path/to/receipt.jpg"
```

Expected response:

```json
{
  "parsed_items": [
    { "id": "pantry_abc123", "name": "Chicken Breast", "category": "Produce", "expiry": "unknown" }
  ]
}
```

---

## Common issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Missing Firebase env var for apiKey` | `client/.env` doesn't exist | Copy `.env.example` → `.env`, fill in Firebase config from Firebase Console, restart Vite |
| `422 Unprocessable Entity` on upload | `python-multipart` not installed | `pip install python-multipart` |
| `503 glmocr package is not installed` | `glmocr` not installed | `pip install glmocr` |
| Dropdown never appears | `/ingredients` returning an error | Check server logs, verify TheMealDB is reachable |
| `502 Bad Gateway` from `/ingredients` | TheMealDB temporarily unreachable | Transient — will resolve; app falls back to plain text input |
| GLM-OCR returns an empty list | API key missing or invalid | Check `glm_ocr_config.yaml` has the correct key |
| `RuntimeError: No Firebase credentials` | Missing service account | Set `GOOGLE_APPLICATION_CREDENTIALS` or place JSON in `secret/` |

---

## Architecture decisions

**Why module-level cache (not Redis or a database)?**
The ingredient list is ~600 static names that rarely change and are needed on every request. A module-level singleton is the simplest correct solution at this scale.

**Why no auth on `GET /ingredients`?**
The TheMealDB ingredient list is public data. Requiring auth would add latency with no security benefit.

**Why Radix Popover (not a custom dropdown)?**
It is already installed, handles portal rendering and z-index stacking correctly inside Framer Motion modals (BottomSheet), and provides correct ARIA attributes out of the box.

**Why GLM-OCR instead of improving the regex normalizer?**
The hardcoded abbreviation list (~52 entries) would never cover real-world receipt variation. GLM-OCR understands context, handles multilingual text, and requires zero ongoing maintenance.
