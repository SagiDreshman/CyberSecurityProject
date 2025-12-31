from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas import CreateOrderRequest, OrderOut
from typing import List

from typing import List
from app.schemas import EquipmentCreate, EquipmentOut

from app.database import SessionLocal
from app import models
from app.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.auth import hash_password, verify_password, create_access_token
from app.logging_utils import add_log
from app.rbac import get_current_user, require_roles
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Equipment Orders System")
ALLOWED_ROLES = {"employee", "admin", "viewer"}
##Cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_db_user(db: Session, token_user: dict):
    return db.query(models.User).filter(models.User.username == token_user["username"]).first()





# ---------- REGISTER ----------
@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == req.username).first()
    if existing:
        # כישלון – אין user_id
        add_log(db, user_id=None, action="REGISTER", status="FAIL")
        return "The user already exists"

    if req.role not in ALLOWED_ROLES:
        add_log(db, user_id=None, action="REGISTER", status="FAIL")
        raise HTTPException(status_code=400, detail="Invalid role")

    user = models.User(
        username=req.username,
        password_hash=hash_password(req.password),
        role=req.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # הצלחה – יש user_id
    add_log(db, user_id=user.id, action="REGISTER", status="SUCCESS")

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role
    }


# ---------- LOGIN ----------
@app.post("/auth/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()

    if not user or not verify_password(req.password, user.password_hash):
        # כישלון – אין זיהוי משתמש
        add_log(db, user_id=None, action="LOGIN", status="FAIL")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # הצלחה – יש user_id
    add_log(db, user_id=user.id, action="LOGIN", status="SUCCESS")

    token = create_access_token({
        "username": user.username,
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@app.get("/equipment", response_model=List[EquipmentOut])
def list_equipment(db: Session = Depends(get_db), user=Depends(get_current_user)):
    add_log(db, user_id=None, action="GetList", status="SUCCESS")

    items = db.query(models.Equipment).order_by(models.Equipment.id.asc()).all()
    return items
@app.get("/health")
def health(db: Session = Depends(get_db)):
    return {"status": "ok"}



@app.post("/orders")
def create_order(
    req: CreateOrderRequest,
    db: Session = Depends(get_db),
    token_user=Depends(get_current_user)
):
    db_user = get_current_db_user(db, token_user)
    if not db_user:
        add_log(db, user_id=db_user.id, action="CREATE_ORDER", status="FAIL")
        raise HTTPException(status_code=401, detail="User not found")

    # בדיקה שכל SKU קיים
    for item in req.items:
        exists = db.query(models.Equipment).filter(models.Equipment.sku == item.sku).first()
        if not exists:
            add_log(db, user_id=db_user.id, action="CREATE_ORDER", status="FAIL")
            raise HTTPException(status_code=400, detail=f"Unknown SKU: {item.sku}")
    order = models.Order(
        order_id=models.Order.id,
        user_id=db_user.id,
        items=[{"sku": i.sku, "qty": i.qty} for i in req.items],
        status="created"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    add_log(db, user_id=db_user.id, action="CREATE_ORDER", status="SUCCESS")
    return order

@app.get("/orders/my", response_model=List[OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    token_user=Depends(get_current_user)
):
    db_user = db.query(models.User).filter(models.User.username == token_user["username"]).first()
    if not db_user:
        add_log(db, user_id=db_user.id, action="MY_ORDERS", status="FAIL")
        raise HTTPException(status_code=401, detail="User not found")
    add_log(db, user_id=db_user.id, action="MY_ORDERS", status="SUCCESS")
    orders = db.query(models.Order).filter(models.Order.user_id == db_user.id).order_by(models.Order.id.desc()).all()
    return orders


# ---------- WHO AM I ----------
@app.get("/me")
def me(user=Depends(get_current_user)):
    return user


# ---------- ADMIN ONLY ----------
@app.get("/admin/only")
def admin_only(user=Depends(require_roles("admin"))):
    return {"message": f"Hello admin {user['username']}"}

@app.get("/admin/users")
def list_users(db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    add_log(db, user_id=user.id, action="ListUsers", status="SUCCESS")
    return db.query(models.User).order_by(models.User.id.asc()).all()

@app.get("/admin/orders", response_model=List[OrderOut])
def all_orders(db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        add_log(db, user_id=user.id, action="DeleteUser", status="FAIL")
        raise HTTPException(404, "User not found")
    db.delete(u)
    db.commit()
    add_log(db, user_id=user.id, action="DeleteUser", status="SUCCESS")
    return {"message": "deleted"}


@app.post("/equipment", response_model=EquipmentOut)
def add_equipment(
    req: EquipmentCreate,  db: Session = Depends(get_db), user=Depends(require_roles("admin"))
):
    existing = db.query(models.Equipment).filter(models.Equipment.sku == req.sku).first()
    if existing:
        add_log(db, user_id=user.id, action="AddEquipment", status="FAIL")
        raise HTTPException(status_code=400, detail="SKU already exists")
    add_log(db, user_id=user.id, action="AddEquipment", status="SUCCESS")

    item = models.Equipment(name=req.name, sku=req.sku, quantity=req.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item




