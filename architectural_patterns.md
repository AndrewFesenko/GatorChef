# Architectural Patterns & Conventions

## Backend (FastAPI + Firestore)

### Router → Service → Firestore layering
Routers handle HTTP concerns (request validation, auth, response shaping). Services handle business logic and external API calls. Firestore access goes through `app.firebase_admin_init.db`.

Current example of the full chain: `routers/upload.py:20-40` orchestrates three services in sequence: `ocr_service.extract_text()` → `receipt_parser.parse()` → `normalizer.normalize()` → Firestore write.

For simple operations (auth upsert), routers may call Firestore directly: `routers/auth.py:15-27`.

### Dependency injection via FastAPI Depends()
All protected endpoints receive a decoded Firebase token through `Depends(verify_firebase_token)`. The dependency is defined once in `app/deps.py` and injected as a parameter: `token: dict = Depends(verify_firebase_token)`. The token dict contains `uid`, `email`, `name`, `picture`.

Every router that needs auth uses this same pattern — see `routers/auth.py:13`, `routers/upload.py:16`, `routers/pantry.py:12`.

### Router module pattern
Each router file creates `router = APIRouter(prefix="/feature", tags=["feature"])` and is included in `main.py` via `app.include_router(router)`. Routers live in `app/routers/` with one file per feature domain.

### Pydantic model layering (Create/Update/Full)
Models follow a three-tier pattern in `app/models.py`:
- `PantryItem` — full model with optional `id` (for responses)
- `PantryItemCreate` — required fields only (for POST body)
- `PantryItemUpdate` — all fields optional (for PATCH body)

### Service functions are module-level, not classes
Services expose plain functions, not class instances. Import pattern: `from app.services import ocr_service` then call `ocr_service.extract_text(bytes)`. Private helpers are prefixed with underscore: `normalizer.py:_load_mealdb_ingredients()`.

### Module-level caching for external data
The normalizer caches TheMealDB's ingredient list in a module-level global (`normalizer.py:5`). First call fetches via httpx, subsequent calls reuse the cached list. Same pattern should be used for recipe service's cached data.

### Configuration via pydantic-settings
`app/config.py` uses `pydantic_settings.BaseSettings` loading from `.env`. Access anywhere via `from app.config import settings`. All env vars have sensible defaults for local development.

## Frontend (React + TypeScript + Tailwind)

### Type mirroring
`frontend/src/types.ts` mirrors every Pydantic model from `backend/app/models.py`. When adding a backend model, add the matching TypeScript interface here.

### Component organization
- `pages/` — route-level components, named `*Page.tsx` (LoginPage, CapturePage, PantryPage, RecipesPage)
- `components/` — reusable UI components (Navbar, RecipeCard, PantryItemRow, etc.)
- `hooks/` — custom hooks prefixed `use*` that wrap API calls
- `contexts/` — React Context providers for global state

### API client pattern (planned)
`api.ts` will be a single axios instance with a request interceptor that attaches the Firebase ID token as `Bearer {token}`. All hooks call through this instance — never raw fetch.

### Auth flow (planned)
`AuthContext` wraps the app, listens to `onAuthStateChanged`, exposes `user/signIn/signOut`. `ProtectedRoute` wraps authed pages and redirects to `/login`. `useAuth()` is the convenience hook.

## Firestore Schema

```
users/{uid}
  ├── uid, email, display_name, photo_url       # set by auth.py
  └── pantry/ (subcollection)
      └── {auto_id}: { name, quantity, unit }   # set by upload.py, managed by pantry routes

cached_recipes/{meal_id}                         # planned for Phase 4, 24h TTL
  └── { recipe data from TheMealDB }
```

## External APIs

| API | Used by | Auth |
|-----|---------|------|
| Google Cloud Vision | `ocr_service.py` | Service account key (env var path) |
| TheMealDB | `normalizer.py`, `recipe_service.py` (planned) | None (free API) |
| Firebase Auth | `deps.py` (verify), frontend (sign-in) | Service account (backend), API key (frontend) |
