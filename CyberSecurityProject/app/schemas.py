from pydantic import BaseModel
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel

class Role(str, Enum):
    employee = "employee"
    admin = "admin"
    viewer = "viewer"

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: Role = Role.employee  # ברירת מחדל

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


class EquipmentCreate(BaseModel):
    name: str
    sku: str
    quantity: int

class EquipmentOut(BaseModel):
    id: int
    name: str
    sku: str
    quantity: int

    class Config:
        from_attributes = True
class OrderItem(BaseModel):
    sku: str
    qty: int

class CreateOrderRequest(BaseModel):
    items: List[OrderItem]

class OrderOut(BaseModel):
    id: int
    user_id: int
    items: list
    status: str

    class Config:
        from_attributes = True