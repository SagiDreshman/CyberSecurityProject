from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models
from app.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.auth import hash_password, verify_password, create_access_token
from app.logging_utils import add_log
from app.rbac import get_current_user, require_roles

app = FastAPI(title="Equipment Orders System")


# DB dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- REGISTER ----------
@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == req.username).first()
    if existing:
        # כישלון – אין user_id
        add_log(db, user_id=None, action="REGISTER", status="FAIL")
        raise HTTPException(status_code=400, detail="Username already exists")

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


# ---------- WHO AM I ----------
@app.get("/me")
def me(user=Depends(get_current_user)):
    return user


# ---------- ADMIN ONLY ----------
@app.get("/admin/only")
def admin_only(user=Depends(require_roles("admin"))):
    return {"message": f"Hello admin {user['username']}"}
