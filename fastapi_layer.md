# GatorChef Backend — FastAPI + Uvicorn Layer

## Stack

| Layer | Role |
|---|---|
| **Uvicorn** (`uvicorn==0.35.0`) | ASGI server. Listens on port 8000, hands requests to FastAPI. |
| **FastAPI** | Routing, Pydantic validation, dependency injection, auto-docs. |

No Django, no Flask, no Express.

---

## QUESTIONS 
### Was it already there? 
Yes — uvicorn==0.35.0 was in requirements.txt    from commit one. Our changes added httpx, glmocr, and python-multipart alongside it, but uvicorn was always the server. 

### Is it for the model? 
No — uvicorn has nothing to do with GLM-OCR. The relationship is: Uvicorn  →  serves your FastAPI app  →  FastAPI routes call glm_ocr_service (web server)    (your backend code)         (which calls Zhipu's cloud)

## Starting the Server

```bash
cd server
pip install -r requirements.txt        # first time only
uvicorn app.main:app --reload --port 8000
# or, if uvicorn isn't in PATH:
python -m uvicorn app.main:app --reload --port 8000
```

`--reload` auto-restarts on file changes. Remove it in production.

---

## Request Flow

```
React (port 5173)
  └─ HTTP + Authorization: Bearer <Firebase token>
       └─ Uvicorn (port 8000)
            └─ FastAPI matches route
                 └─ Depends(get_current_user) validates token
                      └─ Route handler runs
                           └─ Pydantic validates body / response
                                └─ JSON → frontend
```

---

## Entry Point

`server/app/main.py` — creates the `FastAPI` app, registers CORS middleware, and mounts all routers:

```python
app = FastAPI(title="GatorChef Backend")
app.add_middleware(CORSMiddleware, allow_origins=[...])  # localhost:5173, localhost:8080
app.include_router(pantry_router)
app.include_router(ingredients_router)
app.include_router(upload_router)
app.include_router(users_router)
```

A single `GET /health` route lives here for uptime checks.

---

## Routers (`server/app/routes/`)

Each file declares `router = APIRouter(prefix="...", tags=["..."])` and is registered in `main.py`.

| File | Prefix | Responsibility |
|---|---|---|
| `pantry.py` | `/pantry` | CRUD for pantry items |
| `ingredients.py` | `/ingredients` | Canonical ingredient list (TheMealDB) |
| `upload.py` | `/upload` | POST receipt image → GLM-OCR → pantry |
| `users.py` | `/users` | User profile management |

---

## Auth

Protected routes use FastAPI's dependency injection:

```python
current_user: AuthenticatedUser = Depends(get_current_user)
```

`get_current_user` (`server/app/dependencies/auth.py`) validates the Firebase ID token from the `Authorization: Bearer <token>` header and returns `AuthenticatedUser(uid, email)`.

`GET /ingredients` is the only unprotected route.

---

## Pydantic Schemas (`server/app/schemas/`)

FastAPI validates requests and responses automatically. Invalid input returns a `422` with field-level error detail.

| Schema | Used for |
|---|---|
| `PantryItemCreate` | POST `/pantry` request body |
| `PantryItemUpdate` | PUT `/pantry/{id}` request body |
| `PantryItemResponse` | All pantry endpoint responses (includes `id`) |

---

## Service Layer (`server/app/services/`)

Routes contain no business logic — they delegate to services:

| Route | Service(s) |
|---|---|
| `pantry.py` | `pantry_service.py` (Firestore) |
| `upload.py` | `glm_ocr_service.py` → `ingredient_loader.py` |
| `ingredients.py` | `ingredient_loader.py` |

Services are module-level singletons (`pantry_service = PantryService()`) or plain async functions.

---

## Auto-generated API Docs

FastAPI builds interactive docs from the code — no maintenance required:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

Use these to test endpoints directly in the browser instead of writing curl commands.
