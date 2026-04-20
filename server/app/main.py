import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.ingredients import router as ingredients_router
from app.routes.pantry import router as pantry_router
from app.routes.upload import router as upload_router
from app.routes.users import router as users_router
from app.services.ingredient_loader import get_mealdb_ingredients

load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ingredients = await get_mealdb_ingredients()
        logger.info("Preloaded %d MealDB ingredients into in-memory cache", len(ingredients))
    except Exception as exc:
        # Surface the failure loudly but don't block startup — /upload/receipt
        # will fail cleanly later if the cache is empty.
        logger.error("Failed to preload MealDB ingredients at startup: %s", exc)
    yield


app = FastAPI(title="GatorChef Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingredients_router)
app.include_router(pantry_router)
app.include_router(upload_router)
app.include_router(users_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
