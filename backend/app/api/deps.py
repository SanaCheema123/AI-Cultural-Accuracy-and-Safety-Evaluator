from __future__ import annotations
import hashlib, uuid
from datetime import datetime, timezone
from dataclasses import dataclass
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.rbac import has_permission
from app.core.security import decode_token
from app.models.entities import APIKey, Membership, User

@dataclass(slots=True)
class AuthContext:
    user: User
    workspace_id: uuid.UUID
    role: str
    auth_type: str="bearer"


def get_auth_context(request:Request,db:Session=Depends(get_db),authorization:str|None=Header(default=None),x_api_key:str|None=Header(default=None)) -> AuthContext:
    if x_api_key:
        key_hash=hashlib.sha256(x_api_key.encode()).hexdigest()
        api_key=db.scalar(select(APIKey).where(APIKey.key_hash==key_hash,APIKey.revoked_at.is_(None)))
        if not api_key: raise HTTPException(status_code=401,detail="Invalid API key")
        user=db.get(User,api_key.created_by_id)
        mem=db.scalar(select(Membership).where(Membership.user_id==user.id,Membership.workspace_id==api_key.workspace_id))
        if not user or not mem: raise HTTPException(status_code=401,detail="Invalid API key context")
        api_key.last_used_at=datetime.now(timezone.utc);db.commit()
        return AuthContext(user,api_key.workspace_id,mem.role,"api_key")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="Authentication required")
    token=authorization.split(" ",1)[1]
    try: payload=decode_token(token,"access")
    except ValueError: raise HTTPException(status_code=401,detail="Invalid or expired token")
    user=db.get(User,uuid.UUID(payload["sub"]))
    workspace_id=uuid.UUID(payload["workspace_id"])
    if not user or not user.is_active: raise HTTPException(status_code=401,detail="User unavailable")
    mem=db.scalar(select(Membership).where(Membership.user_id==user.id,Membership.workspace_id==workspace_id))
    if not mem: raise HTTPException(status_code=403,detail="Workspace access denied")
    return AuthContext(user,workspace_id,mem.role)

def require(permission:str):
    def dependency(ctx:AuthContext=Depends(get_auth_context))->AuthContext:
        if not has_permission(ctx.role,permission): raise HTTPException(status_code=403,detail="Permission denied")
        return ctx
    return dependency
