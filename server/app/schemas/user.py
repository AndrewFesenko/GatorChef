from pydantic import BaseModel, EmailStr, Field


class UserProfileUpsert(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=100)
    photo_url: str | None = None


class UserProfileResponse(BaseModel):
    uid: str
    email: EmailStr
    display_name: str
    photo_url: str | None = None
