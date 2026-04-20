# How Does GatorChef Work

## Project Summary

GatorChef is a meal planning and grocery management web app for college students. Students scan a grocery receipt or manually type pantry items; the app matches what they have to budget-friendly recipes and generates a shopping list for what they are missing. The core engineering challenge is the OCR pipeline: turning a receipt photo into canonical ingredient names the recipe engine already understands.

---

## The Problem It Solves

College students face a gap between having groceries and knowing what to cook. Most meal planning tools assume cooking confidence, stable routines, and flexible budgets. GatorChef is built around the inverse — minimal time, tight budgets, and an unknown pantry.

---

## Features

| Feature | Status |
|---|---|
| Pantry CRUD (list, add, edit, delete) | Functional |
| Manual ingredient add with autocomplete (MealDB-backed) | Functional |
| User auth (email/password) | Functional |
| Receipt scan → ingredient extraction (OCR pipeline) | In progress |
| Recipe recommendations ranked by pantry overlap | Functional |
| Shopping list generation for missing ingredients | Functional |
| Dietary filtering | Planned |

---

## Decisions Made

### Tech Stack — Why Each Choice

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Type safety at scale; Vite for fast dev builds |
| Styling | Tailwind + shadcn/Radix UI | Rapid consistent UI; accessible primitives out of the box |
| Frontend state | TanStack React Query | Server-state cache without boilerplate |
| Backend | Python + FastAPI | Fast iteration, clean type annotations, auto-generated `/docs` |
| Database | Firebase Firestore | Cloud NoSQL, real-time capable, pairs with Firebase Auth |
| Auth | Firebase Auth | Handles token lifecycle; backend verifies ID tokens server-side |
| OCR/LLM vision | Zhipu GLM-OCR (MaaS via `glmocr`) | LLM-backed vision sidesteps classical OCR brittleness on grocery receipts |
| Canonical ingredient truth | TheMealDB API | Free, stable ingredient list; recipe engine already uses it |
| Containerization | Docker + nginx | Dev: bind-mounted Vite container; prod: static nginx image |

### Server Operation

- `python run.py` → uvicorn with reload on `http://127.0.0.1:8000`
- Layered: **Route → Service → Firestore client** — routes handle HTTP, services hold logic, the Firestore client is the only place `firebase_admin` is touched
- Every protected route injects `Depends(get_current_user)` — no manual token decoding in routes
- Services wrap unexpected errors as `HTTPException(503)` and re-raise known `HTTPException` untouched; routes never re-wrap
- CORS is explicit (`5173`, `8080`, localhost regex) — no wildcard

### Client Operation

- `npm run dev` → Vite dev server
- All backend calls go through `apiRequest()` in `client/src/lib/api.ts` — attaches Firebase ID token, retries once on `401` with a force-refresh
- Auth state lives in `AuthProvider` (`lib/auth.tsx`); route guards split into `ProtectedRoute` / `PublicOnlyRoute`
- MealDB ingredient list is fetched once via module-level cache + in-flight dedup — not re-queried per keystroke

### OCR Pipeline Decision

OCR-first, not LLM-first. The pipeline preprocesses each receipt line through token cleaning and abbreviation expansion before the GLM is ever consulted. GLM is a fallback for lines that fail dictionary matching — it does not write to the pantry directly and must resolve through MealDB validation.

Pipeline order:
1. Raw OCR line extraction (Google Cloud Vision)
2. Token cleaning (strip prices, weights, PLU codes, normalize caps)
3. Abbreviation expansion (`abbreviations.json` lookup)
4. Dictionary matching against cached MealDB list (exact → fuzzy → embedding)
5. GLM fallback for null results only
6. Unresolved logging (feedback loop for expanding abbreviation table)

### Key Links

| Resource | Path / URL |
|---|---|
| Backend entry | `server/app/main.py` |
| Auth dependency | `server/app/dependencies/auth.py:22` |
| OCR service | `server/app/services/glm_ocr_service.py` |
| Pantry service | `server/app/services/pantry_service.py` |
| API client (frontend) | `client/src/lib/api.ts:48` |
| AuthProvider | `client/src/lib/auth.tsx` |
| Autocomplete component | `client/src/components/AutocompleteInput.tsx` |
| Architectural patterns doc | `.claude/docs/architectural_patterns.md` |
| OCR feature objectives | `v2-ocr_feature_objectives` |
| Health check | `GET http://127.0.0.1:8000/health` |
| Backend API docs | `http://127.0.0.1:8000/docs` |

---

## One-Line Data Flow

> User uploads receipt → backend OCR pipeline cleans and matches lines to canonical MealDB ingredient names → confirmed items write to Firestore pantry → recipe engine ranks meals by pantry overlap → frontend shows recommendations and shopping list for missing ingredients.

---

## Firestore Schema

```
users/{uid}
  ├── (profile fields)
  └── pantry/{item_id}
       └── { name, category, expiry, source?, source_ref? }
```

---

## Upload Session Lifecycle

```
POST /upload/session   → { session_id }       status: pending
POST /upload/receipt   → { extracted_items[], unresolved[], warnings[] }
POST /pantry/batch     → confirms selection    status: confirmed
```

Duplicate image hashes within a time window are rejected before OCR runs.
