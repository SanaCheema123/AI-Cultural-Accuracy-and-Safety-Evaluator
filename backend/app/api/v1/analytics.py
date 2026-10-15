from __future__ import annotations
from fastapi import APIRouter,Depends,Request
from sqlalchemy.orm import Session
from app.api.deps import AuthContext,require
from app.analytics.service import AnalyticsService
from app.core.db import get_db
from app.core.responses import envelope
router=APIRouter(prefix="/analytics",tags=["Analytics"])
@router.get("")
def analytics(request:Request,days:int=30,db:Session=Depends(get_db),ctx:AuthContext=Depends(require("evaluation:view"))):
    days=max(1,min(days,365));return envelope(request,AnalyticsService(db).dashboard(ctx.workspace_id,days))
