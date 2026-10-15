from __future__ import annotations
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from app.models.entities import Evaluation

class AnalyticsService:
    def __init__(self,db:Session):self.db=db
    def dashboard(self,workspace_id:uuid.UUID,days:int=30):
        since=datetime.now(timezone.utc)-timedelta(days=days)
        items=self.db.scalars(select(Evaluation).options(selectinload(Evaluation.result),selectinload(Evaluation.cultural_findings),selectinload(Evaluation.safety_findings),selectinload(Evaluation.bias_findings)).where(Evaluation.workspace_id==workspace_id,Evaluation.created_at>=since).order_by(Evaluation.created_at)).unique().all()
        completed=[e for e in items if e.result]
        def avg(attr):
            vals=[getattr(e.result,attr) for e in completed]
            return round(sum(vals)/len(vals),3) if vals else 0.0
        pending=sum(1 for e in completed if e.result.review_recommendation in {"required","recommended"})
        dates=Counter(e.created_at.date().isoformat() for e in items)
        flags=Counter()
        for e in completed:
            for f in [*e.cultural_findings,*e.safety_findings,*e.bias_findings]:
                if f.severity in {"medium","high","critical"}:flags[f.category]+=1
        model_perf={}
        for e in completed:
            m=model_perf.setdefault(e.model_name,{"count":0,"cultural":0.0,"safety":0.0,"similarity":0.0})
            m["count"]+=1;m["cultural"]+=e.result.cultural_score;m["safety"]+=e.result.safety_score;m["similarity"]+=e.result.similarity_score
        for m in model_perf.values():
            for k in ("cultural","safety","similarity"):m[k]=round(m[k]/m["count"],3)
        return {"period_days":days,"kpis":{"total_evaluations":len(items),"average_cultural_accuracy":avg("cultural_score"),"safety_pass_rate":round(sum(1 for e in completed if e.result.safety_score>=.9)/len(completed),3) if completed else 0,"human_reviews_pending":pending},"volume":[{"date":d,"count":dates[d]} for d in sorted(dates)],"model_performance":[{"model":k,**v} for k,v in model_perf.items()],"flag_distribution":[{"category":k,"count":v} for k,v in flags.most_common(10)]}
