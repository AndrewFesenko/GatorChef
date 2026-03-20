from pydantic import BaseModel, EmailStr, Field


class UserProfileUpsert(BaseModel):
    email: EmailStr
    display_name: str = Field(min_length=1, max_length=100)


class UserProfileResponse(BaseModel):
    uid: str
    email: EmailStr
    display_name: str
