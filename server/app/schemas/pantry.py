from pydantic import BaseModel, Field


class PantryItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str | None = Field(default=None, max_length=50)
    expiry: str = Field(min_length=1, max_length=50)


class PantryItemCreate(PantryItemBase):
    # Optional provenance fields populated when items are created from a scan session.
    source: str | None = Field(default=None)
    source_ref: str | None = Field(default=None)


class PantryItemUpdate(PantryItemBase):
    pass


class PantryItemResponse(PantryItemBase):
    id: str
    created_at: int | None = None
