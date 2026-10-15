from __future__ import annotations
import re, uuid
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.security import create_token, hash_password, verify_password
from app.models.entities import Membership, Organization, User, Workspace
from app.schemas.domain import AuthRegister, SessionOut, UserOut

_slug_rx=re.compile(r"[^a-z0-9]+")
def slugify(v: str) -> str:
    s=_slug_rx.sub("-",v.lower()).strip("-") or "workspace"
    return s[:120]

class AuthService:
    def __init__(self,db:Session): self.db=db
    def register(self,data:AuthRegister) -> tuple[User,Workspace,Membership]:
        if self.db.scalar(select(User).where(User.email==data.email)):
            raise ValueError("Email is already registered")
        # Keep tenant isolation internally without asking the user for an organization.
        # Each new account receives a private personal workspace automatically.
        org_name = f"{data.full_name.strip()} Workspace"
        org=Organization(name=org_name,slug=f"{slugify(data.full_name)}-{uuid.uuid4().hex[:6]}")
        self.db.add(org); self.db.flush()
        ws=Workspace(organization_id=org.id,name="My Workspace",slug="main")
        user=User(email=data.email,password_hash=hash_password(data.password),full_name=data.full_name)
        self.db.add_all([ws,user]); self.db.flush()
        mem=Membership(workspace_id=ws.id,user_id=user.id,role="owner")
        self.db.add(mem); self.db.commit(); self.db.refresh(user); self.db.refresh(ws); self.db.refresh(mem)
        return user,ws,mem
    def login(self,email:str,password:str) -> tuple[User,Workspace,Membership]:
        user=self.db.scalar(select(User).where(User.email==email.strip().lower()))
        if not user or not user.is_active or not verify_password(password,user.password_hash):
            raise ValueError("Invalid email or password")
        mem=self.db.scalar(select(Membership).where(Membership.user_id==user.id).limit(1))
        if not mem: raise ValueError("No workspace membership")
        ws=self.db.get(Workspace,mem.workspace_id)
        user.last_login_at=datetime.now(timezone.utc); self.db.commit()
        return user,ws,mem
    @staticmethod
    def session(user:User,ws:Workspace,mem:Membership)->SessionOut:
        extra={"workspace_id":str(ws.id),"role":mem.role}
        return SessionOut(access_token=create_token(str(user.id),"access",extra),refresh_token=create_token(str(user.id),"refresh",extra),user=UserOut.model_validate(user),workspace_id=ws.id,role=mem.role)
