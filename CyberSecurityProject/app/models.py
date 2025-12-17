from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="employee")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    items = Column(JSON, nullable=False)   # לדוגמה: [{"sku":"KB-1","qty":2}, ...]
    status = Column(String(30), nullable=False, default="created")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user_id = Column(Integer, nullable=True)
    action = Column(String(60), nullable=False)      # למשל: LOGIN, CREATE_ORDER
    status = Column(String(20), nullable=False)      # SUCCESS / FAIL
    details = Column(JSON, nullable=True)
