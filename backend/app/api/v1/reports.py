from __future__ import annotations
import uuid
from fastapi import APIRouter,Depends,HTTPException,Request
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import AuthContext,require
from app.core.db import get_db
from app.core.responses import envelope
from app.models.entities import Report
from app.reports.service import ReportService
router=APIRouter(prefix="/reports",tags=["Reports"])

@router.post("")
def generate(evaluation_id:uuid.UUID,request:Request,format:str="pdf",db:Session=Depends(get_db),ctx:AuthContext=Depends(require("report:export"))):
    if format not in {"pdf","csv","json"}:raise HTTPException(status_code=422,detail="format must be pdf, csv, or json")
    try:r=ReportService(db).create(ctx.workspace_id,ctx.user.id,evaluation_id,format);return envelope(request,{"id":str(r.id),"evaluation_id":str(r.evaluation_id),"title":r.title,"format":r.format,"file_url":r.file_url,"status":r.status,"created_at":r.created_at.isoformat()})
    except LookupError:raise HTTPException(status_code=404,detail="Evaluation not found")

@router.get("")
def list_reports(request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    rows=db.scalars(select(Report).where(Report.workspace_id==ctx.workspace_id).order_by(Report.created_at.desc()).limit(100)).all()
    return envelope(request,[{"id":str(r.id),"evaluation_id":str(r.evaluation_id),"title":r.title,"format":r.format,"file_url":r.file_url,"status":r.status,"created_at":r.created_at.isoformat()} for r in rows])

@router.get("/{report_id}")
def get_report(report_id:uuid.UUID,request:Request,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    r=db.scalar(select(Report).where(Report.id==report_id,Report.workspace_id==ctx.workspace_id))
    if not r:raise HTTPException(status_code=404,detail="Report not found")
    return envelope(request,{"id":str(r.id),"evaluation_id":str(r.evaluation_id),"title":r.title,"format":r.format,"file_url":r.file_url,"status":r.status,"created_at":r.created_at.isoformat(),"snapshot":r.snapshot_json})
