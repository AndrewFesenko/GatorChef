from __future__ import annotations

from pydantic import BaseModel, Field


class RecipeIngredient(BaseModel):
    name: str
    amount: str = ""


class RecipeStep(BaseModel):
    step: int = Field(ge=1)
    instruction: str


class RecipeSummary(BaseModel):
    id: str
    title: str
    desc: str
    time: str
    servings: int = Field(ge=1)
    difficulty: str
    tags: list[str] = Field(default_factory=list)
    ingredients: list[str] = Field(default_factory=list)
    image_url: str | None = None
    category: str | None = None
    area: str | None = None


class RecipeDetail(RecipeSummary):
    ingredient_details: list[RecipeIngredient] = Field(default_factory=list)
    steps: list[RecipeStep] = Field(default_factory=list)
    tips: list[str] = Field(default_factory=list)
    source_url: str | None = None
    youtube_url: str | None = None


class RecipeMatch(RecipeSummary):
    score: float = Field(ge=0, le=1)
    match_count: int = Field(ge=0)
    match_percent: int = Field(ge=0, le=100)
    matched_ingredients: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)


class RecipeMatchResponse(BaseModel):
    pantry_count: int = Field(ge=0)
    recommendations: list[RecipeMatch] = Field(default_factory=list)
