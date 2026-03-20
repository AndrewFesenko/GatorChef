from pydantic import BaseModel, Field


class PantryItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=50)
    expiry: str = Field(min_length=1, max_length=50)


class PantryItemCreate(PantryItemBase):
    pass


class PantryItemUpdate(PantryItemBase):
    pass


class PantryItemResponse(PantryItemBase):
    id: str
