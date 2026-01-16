from sqlalchemy.orm import Session
from app import models
import time
def add_log(db: Session, user_id, action, status):
    log = models.Log(

        user_id=user_id,
        action=action,
        status=status
    )
    db.add(log)
    db.commit()
