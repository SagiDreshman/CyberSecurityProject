from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth import decode_token

bearer = HTTPBearer()

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    token = creds.credentials
    try:
        payload = decode_token(token)
        # payload אמור להכיל username + role
        return {"username": payload.get("username"), "role": payload.get("role")}
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

def require_roles(*roles: str):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return user
    return checker
