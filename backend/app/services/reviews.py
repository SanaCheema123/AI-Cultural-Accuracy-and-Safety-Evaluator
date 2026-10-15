from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.entities import Evaluation,ExpertReview,ReviewAnnotation
from app.schemas.domain import ReviewCreate
from app.services.audit import audit

class ReviewService:
    def __init__(self,db:Session):self.db=db
    def create(self,workspace_id:uuid.UUID,evaluation_id:uuid.UUID,reviewer_id:uuid.UUID,data:ReviewCreate)->ExpertReview:
        ev=self.db.scalar(select(Evaluation).where(Evaluation.id==evaluation_id,Evaluation.workspace_id==workspace_id))
        if not ev:raise LookupError("Evaluation not found")
        previous=self.db.scalar(select(ExpertReview).where(ExpertReview.evaluation_id==evaluation_id).order_by(ExpertReview.created_at.desc()).limit(1))
        review=ExpertReview(evaluation_id=evaluation_id,reviewer_id=reviewer_id,decision=data.decision,previous_decision=previous.decision if previous else None,severity_override=data.severity_override,comment=data.comment,explanation=data.explanation)
        self.db.add(review);self.db.flush()
        for item in data.annotations:
            self.db.add(ReviewAnnotation(review_id=review.id,finding_type=str(item.get("finding_type","general")),finding_id=item.get("finding_id") or None,note=str(item.get("note",""))[:4000]))
        audit(self.db,workspace_id,reviewer_id,"review.created","expert_review",str(review.id),{"evaluation_id":str(evaluation_id),"decision":data.decision});self.db.commit();self.db.refresh(review);return review
