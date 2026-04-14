from __future__ import annotations

from pydantic import BaseModel, Field


class RecipeMatch(BaseModel):
    id_meal: str
    title: str
    score: float = Field(ge=0, le=1)
    matched_ingredients: list[str] = Field(default_factory=list)
    missing_ingredients: list[str] = Field(default_factory=list)
