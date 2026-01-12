from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import engine
from app.schemas import CreateOrderRequest, OrderOut
from typing import List
from app.schemas import UpdateOrderStatusRequest


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
ALLOWED_ORDER_STATUS = {"created", "paid"}



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

models.Base.metadata.create_all(bind=engine)
# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_db_user(db: Session, token_user: dict):
    return db.query(models.User).filter(models.User.username == token_user["username"]).first()

def safe_user_id(db: Session, token_user: dict):

    try:
        db_user = get_current_db_user(db, token_user)
        return db_user.id if db_user else None
    except Exception:
        return None






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
def list_equipment(db: Session = Depends(get_db)):
    add_log(db, user_id=None, action="GetList", status="SUCCESS")

    items = db.query(models.Equipment).order_by(models.Equipment.id.asc()).all()
    return items
@app.get("/health")
def health(db: Session = Depends(get_db)):
    return {"status": "ok"}

@app.post("/orders/checkout")
def checkout(
    db: Session = Depends(get_db),
    token_user=Depends(get_current_user)
):
    db_user = get_current_db_user(db, token_user)
    if not db_user:
        add_log(db, user_id=None, action="CHECKOUT", status="FAIL")
        raise HTTPException(status_code=401, detail="User not found")

    # כל מה שבעגלה = orders עם status "created"
    cart_orders = (
        db.query(models.Order)
        .filter(models.Order.user_id == db_user.id, models.Order.status == "created")
        .order_by(models.Order.id.asc())
        .all()
    )

    if not cart_orders:
        add_log(db, user_id=db_user.id, action="CHECKOUT", status="FAIL")
        raise HTTPException(status_code=400, detail="Cart is empty")

    # מאחדים את כל הפריטים לחבילה אחת
    merged_items = []
    for o in cart_orders:
        merged_items.extend(o.items)  # o.items זה JSON אצלך

    # שומרים להיסטוריה כחבילה אחת
    history = models.HistoryOrder(
        user_id=db_user.id,
        items=merged_items,
        status="paid"
    )
    db.add(history)

    # מעיפים מהעגלה: מסמנים את ההזמנות כ-paid
    for o in cart_orders:
        o.status = "paid"

    db.commit()
    db.refresh(history)

    add_log(db, user_id=db_user.id, action="CHECKOUT", status="SUCCESS")
    return {"history_id": history.id, "items_count": len(history.items)}


@app.get("/history/my")
def my_history(db: Session = Depends(get_db), token_user=Depends(get_current_user)):
    db_user = get_current_db_user(db, token_user)
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")

    return (
        db.query(models.HistoryOrder)
        .filter(models.HistoryOrder.user_id == db_user.id)
        .order_by(models.HistoryOrder.id.desc())
        .all()
    )


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
        user_id=db_user.id,
        items=[{"sku": i.sku, "qty": i.qty} for i in req.items],
        status="created"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    add_log(db, user_id=db_user.id, action="CREATE_ORDER", status="SUCCESS")
    return {
        "id": order.id,
        "user_id": order.user_id,
        "items": order.items,
        "status": order.status
    }

@app.get("/orders/my", response_model=List[OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    token_user=Depends(get_current_user)
):
    db_user = db.query(models.User).filter(models.User.username == token_user["username"]).first()
    if not db_user:
        add_log(db, user_id=None, action="MY_ORDERS", status="FAIL")
        raise HTTPException(status_code=401, detail="User not found")

    orders = (
        db.query(models.Order)
        .filter(
            models.Order.user_id == db_user.id,
            models.Order.status == "created"   # ✅ רק עגלה
        )
        .order_by(models.Order.id.desc())
        .all()
    )

    add_log(db, user_id=db_user.id, action="MY_ORDERS", status="SUCCESS")
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
def list_users(
    db: Session = Depends(get_db),
    token_user=Depends(require_roles("admin"))
):

    users = db.query(models.User).order_by(models.User.id.asc()).all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]


@app.post("/admin/users")
def admin_create_user(
    req: RegisterRequest,   # {username, password, role}
    db: Session = Depends(get_db),
    token_user=Depends(require_roles("admin"))
):
    # בדיקת role חוקי
    if req.role not in {"employee", "admin", "viewer"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    # בדיקה שלא קיים כבר
    exists = db.query(models.User).filter(models.User.username == req.username).first()
    if exists:
        raise HTTPException(status_code=400, detail="Username already exists")

    u = models.User(
        username=req.username,
        password_hash=hash_password(req.password),
        role=req.role
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    return {"id": u.id, "username": u.username, "role": u.role}

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
   # add_log(db, user_id=user.id, action="DeleteUser", status="SUCCESS")
    return {"message": "deleted"}


@app.post("/equipment", response_model=EquipmentOut)
def add_equipment(
    req: EquipmentCreate,  db: Session = Depends(get_db), user=Depends(require_roles("admin"))
):
    existing = db.query(models.Equipment).filter(models.Equipment.sku == req.sku).first()
    if existing:
        add_log(db, user_id=None, action="AddEquipment", status="FAIL")
        raise HTTPException(status_code=400, detail="SKU already exists")
    add_log(db, user_id=None, action="AddEquipment", status="SUCCESS")

    item = models.Equipment(name=req.name, sku=req.sku, quantity=req.quantity)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/admin/users")
def list_users(db: Session = Depends(get_db), token_user=Depends(require_roles("admin"))):
    users = db.query(models.User).order_by(models.User.id.asc()).all()
    return [{"id": u.id, "username": u.username, "role": u.role} for u in users]


@app.put("/admin/orders/{order_id}/status")
def admin_update_order_status(
    order_id: int,
    req: UpdateOrderStatusRequest,
    db: Session = Depends(get_db),
    token_user=Depends(require_roles("admin"))
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = req.status
    db.commit()
    db.refresh(order)
    return {"id": order.id, "status": order.status}


    return {"id": order.id, "status": order.status}
@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), token_user=Depends(require_roles("admin"))):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(u)
    db.commit()
    return {"message": "deleted"}




