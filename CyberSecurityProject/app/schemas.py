from pydantic import BaseModel
from typing import Optional

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "employee"  # ברירת מחדל

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True
