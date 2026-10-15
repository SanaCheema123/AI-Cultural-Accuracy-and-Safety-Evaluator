from __future__ import annotations
import hashlib,secrets,uuid
from datetime import datetime,timezone
from fastapi import APIRouter,Depends,File,HTTPException,Request,UploadFile
from sqlalchemy import func,select
from sqlalchemy.orm import Session
from app.api.deps import AuthContext,get_auth_context,require
from app.core.db import get_db
from app.core.responses import envelope
from app.core.security import hash_password,new_api_key
from app.models.entities import APIKey,Dataset,DatasetItem,Membership,Notification,Organization,Subscription,User,Workspace
from app.schemas.domain import ApiKeyCreate,DatasetCreate,DatasetItemCreate,TeamInvite
from app.services.audit import audit
from app.storage.local import LocalImageStorage

router=APIRouter(tags=["SaaS"])

@router.get("/models")
def models(request: Request, ctx: AuthContext = Depends(require("evaluation:view"))):
    from app.core.config import get_settings

    settings = get_settings()
    payload = []
    if settings.live_ai_configured:
        payload.append(
            {
                "id": "live-provider",
                "name": settings.evaluation_model_name,
                "provider": settings.evaluation_provider_name,
                "model_type": "multimodal",
                "configured": True,
            }
        )
    return envelope(request, payload)

@router.get("/datasets")
def datasets(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    rows=db.scalars(select(Dataset).where(Dataset.workspace_id==ctx.workspace_id).order_by(Dataset.created_at.desc())).all()
    return envelope(request,[{"id":str(d.id),"name":d.name,"description":d.description,"language":d.language,"status":d.status,"tags":d.tags_json,"created_at":d.created_at.isoformat(),"item_count":db.scalar(select(func.count(DatasetItem.id)).where(DatasetItem.dataset_id==d.id)) or 0} for d in rows])

@router.post("/datasets")
def create_dataset(body:DatasetCreate,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("dataset:manage"))):
    d=Dataset(workspace_id=ctx.workspace_id,owner_id=ctx.user.id,name=body.name,description=body.description,language=body.language,tags_json=body.tags);db.add(d);db.flush();audit(db,ctx.workspace_id,ctx.user.id,"dataset.created","dataset",str(d.id));db.commit();db.refresh(d);return envelope(request,{"id":str(d.id),"name":d.name,"status":d.status})

@router.post("/datasets/{dataset_id}/items")
def add_dataset_item(dataset_id:uuid.UUID,body:DatasetItemCreate,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("dataset:manage"))):
    d=db.scalar(select(Dataset).where(Dataset.id==dataset_id,Dataset.workspace_id==ctx.workspace_id))
    if not d:raise HTTPException(status_code=404,detail="Dataset not found")
    item=DatasetItem(dataset_id=d.id,prompt=body.prompt,image_url=body.image_url,tags_json=body.tags,metadata_json=body.metadata);db.add(item);db.commit();db.refresh(item);return envelope(request,{"id":str(item.id),"dataset_id":str(d.id)})

@router.get("/team")
def team(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    rows=db.execute(select(Membership,User).join(User,Membership.user_id==User.id).where(Membership.workspace_id==ctx.workspace_id)).all()
    return envelope(request,[{"membership_id":str(m.id),"user_id":str(u.id),"name":u.full_name,"email":u.email,"role":m.role,"joined_at":m.created_at.isoformat()} for m,u in rows])

@router.post("/team")
def add_team(body:TeamInvite,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("team:manage"))):
    user=db.scalar(select(User).where(User.email==body.email.strip().lower()))
    if not user:raise HTTPException(status_code=404,detail="User must register before being added to this workspace in the current implementation")
    existing=db.scalar(select(Membership).where(Membership.workspace_id==ctx.workspace_id,Membership.user_id==user.id))
    if existing:raise HTTPException(status_code=409,detail="User is already a member")
    m=Membership(workspace_id=ctx.workspace_id,user_id=user.id,role=body.role);db.add(m);audit(db,ctx.workspace_id,ctx.user.id,"team.member_added","membership",str(m.id),{"email":user.email,"role":body.role});db.commit();return envelope(request,{"added":True,"user_id":str(user.id),"role":body.role})

@router.get("/api-keys")
def api_keys(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("api_key:manage"))):
    rows=db.scalars(select(APIKey).where(APIKey.workspace_id==ctx.workspace_id).order_by(APIKey.created_at.desc())).all()
    return envelope(request,[{"id":str(k.id),"name":k.name,"prefix":k.prefix,"created_at":k.created_at.isoformat(),"last_used_at":k.last_used_at.isoformat() if k.last_used_at else None,"revoked":k.revoked_at is not None} for k in rows])

@router.post("/api-keys")
def create_api_key(body:ApiKeyCreate,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("api_key:manage"))):
    secret,prefix,key_hash=new_api_key();k=APIKey(workspace_id=ctx.workspace_id,created_by_id=ctx.user.id,name=body.name,prefix=prefix,key_hash=key_hash);db.add(k);db.flush();audit(db,ctx.workspace_id,ctx.user.id,"api_key.created","api_key",str(k.id),{"name":body.name,"prefix":prefix});db.commit();return envelope(request,{"id":str(k.id),"name":k.name,"prefix":prefix,"secret":secret,"warning":"This secret is shown once. Store it securely."})

@router.delete("/api-keys/{key_id}")
def revoke_key(key_id:uuid.UUID,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("api_key:manage"))):
    k=db.scalar(select(APIKey).where(APIKey.id==key_id,APIKey.workspace_id==ctx.workspace_id))
    if not k:raise HTTPException(status_code=404,detail="API key not found")
    k.revoked_at=datetime.now(timezone.utc);audit(db,ctx.workspace_id,ctx.user.id,"api_key.revoked","api_key",str(k.id));db.commit();return envelope(request,{"revoked":True})

@router.get("/notifications")
def notifications(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(get_auth_context)):
    rows=db.scalars(select(Notification).where(Notification.user_id==ctx.user.id,Notification.workspace_id==ctx.workspace_id).order_by(Notification.created_at.desc()).limit(50)).all()
    return envelope(request,[{"id":str(n.id),"title":n.title,"body":n.body,"category":n.category,"is_read":n.is_read,"created_at":n.created_at.isoformat()} for n in rows])

@router.get("/billing")
def billing(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(get_auth_context)):
    ws=db.get(Workspace,ctx.workspace_id);org=db.get(Organization,ws.organization_id) if ws else None;sub=db.scalar(select(Subscription).where(Subscription.organization_id==org.id)) if org else None
    plan=(sub.plan if sub else (org.plan if org else "starter"));limits={"starter":{"evaluations":100,"team_members":3,"api_requests":500},"professional":{"evaluations":2500,"team_members":15,"api_requests":20000},"enterprise":{"evaluations":None,"team_members":None,"api_requests":None}}
    return envelope(request,{"plan":plan,"status":sub.status if sub else "not_connected","limits":limits.get(plan,limits["starter"]),"provider_connected":bool(sub and sub.provider)})

@router.post("/images/analyze")
def image_analyze(request:Request,image:UploadFile=File(...),ctx:AuthContext=Depends(require("evaluation:create"))):
    try:s=LocalImageStorage().save(image);return envelope(request,{"image_url":s.public_url,"thumbnail_url":s.thumbnail_url,"mime":s.mime,"size_bytes":s.size_bytes,"width":s.width,"height":s.height,"sha256":s.sha256,"analysis":"Model not configured; basic secure image validation completed."})
    except ValueError as e:raise HTTPException(status_code=422,detail=str(e))

from app.schemas.domain import ModelComparisonRequest
from app.evaluation.service import EvaluationService

@router.post("/model-comparison")
def model_comparison(body:ModelComparisonRequest,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    rows=[]
    for evaluation_id in body.evaluation_ids:
        try:
            ev=EvaluationService(db).get_evaluation(ctx.workspace_id,evaluation_id)
        except LookupError:
            continue
        if not ev.result:
            continue
        rows.append({
            "evaluation_id":str(ev.id),"model":ev.model_name,"mode":ev.mode,
            "prompt_similarity":ev.result.similarity_score,
            "cultural_accuracy":ev.result.cultural_score,
            "safety":ev.result.safety_score,
            "bias_risk":ev.result.bias_risk,
            "confidence":ev.result.overall_confidence,
            "review_recommendation":ev.result.review_recommendation,
            "processing_time_ms":sum(x.processing_ms for x in ev.model_runs),
        })
    return envelope(request,{"criteria":"Metrics are reported separately; no universal best model is selected.","items":rows})
