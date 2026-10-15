from __future__ import annotations
import csv, io, json, uuid
from pathlib import Path
from typing import Any
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.core.config import get_settings
from app.evaluation.service import EvaluationService
from app.models.entities import Report,AuditLog
from app.services.audit import audit

class ReportService:
    def __init__(self,db:Session):
        self.db=db; self.settings=get_settings(); self.root=Path(self.settings.upload_dir)/"reports";self.root.mkdir(parents=True,exist_ok=True)
    def snapshot(self,workspace_id:uuid.UUID,evaluation_id:uuid.UUID)->dict[str,Any]:
        ev=EvaluationService(self.db).get_evaluation(workspace_id,evaluation_id)
        res=ev.result
        return {
            "report_label":"Live Model Evaluation",
            "evaluation_id":str(ev.id),"created_at":ev.created_at.isoformat(),"completed_at":ev.completed_at.isoformat() if ev.completed_at else None,
            "model":ev.model_name,"mode":ev.mode,"prompt":ev.input.prompt,"image_url":ev.input.image_url,
            "scores": {"similarity":res.similarity_score,"similarity_confidence":res.similarity_confidence,"cultural":res.cultural_score,"cultural_confidence":res.cultural_confidence,"safety":res.safety_score,"safety_confidence":res.safety_confidence,"bias_risk":res.bias_risk,"bias_confidence":res.bias_confidence,"overall_status":res.overall_status,"overall_confidence":res.overall_confidence},
            "cultural_findings":[self._finding(x) | {"uncertainty":x.uncertainty} for x in ev.cultural_findings],
            "safety_findings":[self._finding(x) | {"risk_level":x.risk_level} for x in ev.safety_findings],
            "bias_findings":[self._finding(x) | {"finding":x.finding} for x in ev.bias_findings],
            "human_reviews":[{"decision":x.decision,"comment":x.comment,"explanation":x.explanation,"reviewer_id":str(x.reviewer_id),"created_at":x.created_at.isoformat()} for x in ev.reviews],
            "audit":[{"action":x.action,"resource_type":x.resource_type,"resource_id":x.resource_id,"actor_id":str(x.actor_id) if x.actor_id else None,"created_at":x.created_at.isoformat()} for x in self.db.scalars(select(AuditLog).where(AuditLog.workspace_id==workspace_id,AuditLog.resource_id==str(evaluation_id)).order_by(AuditLog.created_at)).all()],
            "summary":res.summary,"limitations":res.limitations,"review_recommendation":res.review_recommendation,
        }
    @staticmethod
    def _finding(x):
        return {"category":x.category,"severity":x.severity,"confidence":x.confidence,"evidence":x.evidence,"explanation":x.explanation,"recommendation":x.recommendation}
    def create(self,workspace_id:uuid.UUID,user_id:uuid.UUID,evaluation_id:uuid.UUID,fmt:str="pdf")->Report:
        snap=self.snapshot(workspace_id,evaluation_id)
        report=Report(workspace_id=workspace_id,evaluation_id=evaluation_id,generated_by_id=user_id,title=f"CulturalGuard Evaluation {str(evaluation_id)[:8]}",status="ready",format=fmt,snapshot_json=snap)
        self.db.add(report);self.db.flush()
        filename=f"report-{report.id}.{fmt}"
        path=self.root/filename
        if fmt=="json": path.write_text(json.dumps(snap,ensure_ascii=False,indent=2),encoding="utf-8")
        elif fmt=="csv": self._write_csv(path,snap)
        else: self._write_pdf(path,snap);fmt="pdf";report.format="pdf"
        report.file_url=f"/uploads/reports/{filename}";audit(self.db,workspace_id,user_id,"report.generated","report",str(report.id),{"format":fmt,"evaluation_id":str(evaluation_id)});self.db.commit();self.db.refresh(report);return report
    def _write_csv(self,path:Path,snap:dict[str,Any]):
        with path.open("w",newline="",encoding="utf-8-sig") as f:
            w=csv.writer(f);w.writerow(["section","metric","value"]);w.writerow(["metadata","evaluation_id",snap["evaluation_id"]]);w.writerow(["metadata","model",snap["model"]])
            for k,v in snap["scores"].items():w.writerow(["scores",k,v])
            for group in ("cultural_findings","safety_findings","bias_findings"):
                for item in snap[group]:w.writerow([group,item["category"],json.dumps(item,ensure_ascii=False)])
    def _write_pdf(self,path:Path,snap:dict[str,Any]):
        font="Helvetica"
        dejavu=Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
        if dejavu.exists():
            try: pdfmetrics.registerFont(TTFont("DejaVu",str(dejavu)));font="DejaVu"
            except Exception: pass
        c=canvas.Canvas(str(path),pagesize=A4);width,height=A4;y=height-48;c.setFont(font,18);c.drawString(42,y,"CulturalGuard AI — Evaluation Report");y-=24;c.setFont(font,9);c.drawString(42,y,snap["report_label"]);y-=24
        lines=[("Evaluation",snap["evaluation_id"]),("Model",snap["model"]),("Overall status",snap["scores"]["overall_status"]),("Similarity",f"{snap['scores']['similarity']:.1%} (confidence {snap['scores']['similarity_confidence']:.1%})"),("Cultural accuracy",f"{snap['scores']['cultural']:.1%} (confidence {snap['scores']['cultural_confidence']:.1%})"),("Safety",f"{snap['scores']['safety']:.1%} (confidence {snap['scores']['safety_confidence']:.1%})"),("Bias risk",snap["scores"]["bias_risk"]),("Review",snap["review_recommendation"])]
        c.setFont(font,10)
        for label,value in lines:c.drawString(42,y,f"{label}: {value}");y-=16
        y-=8;c.setFont(font,12);c.drawString(42,y,"Summary");y-=18;c.setFont(font,9)
        for chunk in [snap["summary"][i:i+95] for i in range(0,len(snap["summary"]),95)]:c.drawString(42,y,chunk);y-=13
        y-=10;c.setFont(font,12);c.drawString(42,y,"Confidence & Limitations");y-=18;c.setFont(font,9)
        for chunk in [snap["limitations"][i:i+95] for i in range(0,len(snap["limitations"]),95)]:c.drawString(42,y,chunk);y-=13
        y-=10;c.setFont(font,12);c.drawString(42,y,"Human Review");y-=18;c.setFont(font,9)
        if snap.get("human_reviews"):
            for review in snap["human_reviews"][-3:]:
                c.drawString(42,y,f"Decision: {review['decision']}  Reviewer: {review['reviewer_id'][:8]}...");y-=13
        else:
            c.drawString(42,y,"No human review recorded at report generation time.");y-=13
        y-=10;c.setFont(font,12);c.drawString(42,y,"Audit Information");y-=18;c.setFont(font,9)
        for item in snap.get("audit",[])[:6]:
            c.drawString(42,y,f"{item['created_at'][:19]}  {item['action']}  {item.get('resource_type','')}");y-=13
        c.showPage();c.save()
