from __future__ import annotations
import uuid, hashlib, secrets
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import get_auth_context,AuthContext
from app.core.db import get_db
from app.core.responses import envelope
from app.core.security import decode_token,create_token,hash_password
from app.models.entities import Membership,User,Workspace,PasswordResetToken
from app.schemas.domain import AuthLogin,AuthRegister,RefreshRequest,UserPreferences,ForgotPasswordRequest,ResetPasswordRequest
from app.services.auth import AuthService
from app.services.audit import audit
from datetime import datetime,timedelta,timezone

router=APIRouter(prefix="/auth",tags=["Authentication"])

@router.post("/register")
def register(body:AuthRegister,request:Request,db:Session=Depends(get_db)):
    try:
        user,ws,mem=AuthService(db).register(body);session=AuthService.session(user,ws,mem);audit(db,ws.id,user.id,"user.registered","user",str(user.id));db.commit();return envelope(request,session.model_dump(mode="json"))
    except ValueError as e:raise HTTPException(status_code=409,detail=str(e))

@router.post("/login")
def login(body:AuthLogin,request:Request,db:Session=Depends(get_db)):
    try:
        user,ws,mem=AuthService(db).login(body.email,body.password);audit(db,ws.id,user.id,"user.login","user",str(user.id));db.commit();return envelope(request,AuthService.session(user,ws,mem).model_dump(mode="json"))
    except ValueError as e:raise HTTPException(status_code=401,detail=str(e))

@router.post("/refresh")
def refresh(body:RefreshRequest,request:Request,db:Session=Depends(get_db)):
    try:payload=decode_token(body.refresh_token,"refresh")
    except ValueError:raise HTTPException(status_code=401,detail="Invalid or expired refresh token")
    user=db.get(User,uuid.UUID(payload["sub"]));ws=db.get(Workspace,uuid.UUID(payload["workspace_id"]));mem=db.scalar(select(Membership).where(Membership.user_id==user.id,Membership.workspace_id==ws.id)) if user and ws else None
    if not user or not ws or not mem:raise HTTPException(status_code=401,detail="Session context unavailable")
    return envelope(request,AuthService.session(user,ws,mem).model_dump(mode="json"))

@router.get("/me")
def me(request:Request,ctx:AuthContext=Depends(get_auth_context)):
    return envelope(request,{"id":str(ctx.user.id),"email":ctx.user.email,"full_name":ctx.user.full_name,"preferred_language":ctx.user.preferred_language,"theme":ctx.user.theme,"workspace_id":str(ctx.workspace_id),"role":ctx.role})

@router.patch("/me/preferences")
def preferences(body:UserPreferences,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(get_auth_context)):
    if body.preferred_language is not None:ctx.user.preferred_language=body.preferred_language
    if body.theme is not None:ctx.user.theme=body.theme
    audit(db,ctx.workspace_id,ctx.user.id,"settings.changed","user",str(ctx.user.id),body.model_dump(exclude_none=True));db.commit();return envelope(request,{"preferred_language":ctx.user.preferred_language,"theme":ctx.user.theme})


@router.post("/forgot-password")
def forgot_password(body:ForgotPasswordRequest,request:Request,db:Session=Depends(get_db)):
    # Always return an accepted response to avoid account enumeration.
    user=db.scalar(select(User).where(User.email==body.email.strip().lower()))
    data={"accepted":True,"message":"If the account exists, reset instructions are available through the configured delivery provider."}
    if user:
        token=secrets.token_urlsafe(32);token_hash=hashlib.sha256(token.encode()).hexdigest()
        db.add(PasswordResetToken(user_id=user.id,token_hash=token_hash,expires_at=datetime.now(timezone.utc)+timedelta(minutes=30)));db.commit()
    return envelope(request,data)

@router.post("/reset-password")
def reset_password(body:ResetPasswordRequest,request:Request,db:Session=Depends(get_db)):
    token_hash=hashlib.sha256(body.token.encode()).hexdigest();row=db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash==token_hash,PasswordResetToken.used_at.is_(None)))
    now=datetime.now(timezone.utc)
    expires=row.expires_at.replace(tzinfo=timezone.utc) if row and row.expires_at and row.expires_at.tzinfo is None else (row.expires_at if row else None)
    if not row or not expires or expires < now:raise HTTPException(status_code=400,detail="Reset token is invalid or expired")
    user=db.get(User,row.user_id);user.password_hash=hash_password(body.password);row.used_at=now;db.commit();return envelope(request,{"reset":True})
