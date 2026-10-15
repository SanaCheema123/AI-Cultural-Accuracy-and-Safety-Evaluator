from __future__ import annotations
import uuid
from fastapi import APIRouter,Depends,HTTPException,Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import AuthContext,require
from app.core.db import get_db
from app.core.responses import envelope
from app.models.entities import ExpertReview,Evaluation
from app.schemas.domain import ReviewCreate
from app.services.reviews import ReviewService
router=APIRouter(tags=["Human Reviews"])

@router.post("/evaluations/{evaluation_id}/reviews")
def create_review(evaluation_id:uuid.UUID,body:ReviewCreate,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("review:create"))):
    try:r=ReviewService(db).create(ctx.workspace_id,evaluation_id,ctx.user.id,body);return envelope(request,{"id":str(r.id),"evaluation_id":str(r.evaluation_id),"reviewer_id":str(r.reviewer_id),"decision":r.decision,"previous_decision":r.previous_decision,"severity_override":r.severity_override,"comment":r.comment,"explanation":r.explanation,"created_at":r.created_at.isoformat()})
    except LookupError:raise HTTPException(status_code=404,detail="Evaluation not found")

@router.get("/reviews")
def list_reviews(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    rows=db.execute(select(ExpertReview,Evaluation).join(Evaluation,ExpertReview.evaluation_id==Evaluation.id).where(Evaluation.workspace_id==ctx.workspace_id).order_by(ExpertReview.created_at.desc()).limit(100)).all()
    return envelope(request,[{"id":str(r.id),"evaluation_id":str(r.evaluation_id),"reviewer_id":str(r.reviewer_id),"decision":r.decision,"comment":r.comment,"created_at":r.created_at.isoformat(),"model_name":e.model_name} for r,e in rows])
