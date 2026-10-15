from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require
from app.core.db import get_db
from app.core.responses import envelope
from app.evaluation.service import EvaluationService
from app.services.audit import audit

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


def detail(ev):
    result = None
    if ev.result:
        r = ev.result
        result = {
            "id": str(r.id),
            "similarity_score": r.similarity_score,
            "similarity_confidence": r.similarity_confidence,
            "similarity_status": r.similarity_status,
            "cultural_score": r.cultural_score,
            "cultural_confidence": r.cultural_confidence,
            "safety_score": r.safety_score,
            "safety_confidence": r.safety_confidence,
            "bias_risk": r.bias_risk,
            "bias_confidence": r.bias_confidence,
            "overall_status": r.overall_status,
            "overall_confidence": r.overall_confidence,
            "review_recommendation": r.review_recommendation,
            "summary": r.summary,
            "limitations": r.limitations,
        }

    def finding(f, kind):
        value = {
            "id": str(f.id),
            "category": f.category,
            "severity": f.severity,
            "confidence": f.confidence,
            "evidence": f.evidence,
            "explanation": f.explanation,
            "recommendation": f.recommendation,
            "status": f.status,
        }
        if kind == "cultural":
            value["uncertainty"] = f.uncertainty
        if kind == "safety":
            value["risk_level"] = f.risk_level
        if kind == "bias":
            value["finding"] = f.finding
        return value

    return {
        "id": str(ev.id),
        "model_name": ev.model_name,
        "status": ev.status,
        "mode": ev.mode,
        "evaluation_focus": ev.evaluation_focus,
        "progress_step": ev.progress_step,
        "progress_percent": ev.progress_percent,
        "created_at": ev.created_at.isoformat(),
        "completed_at": ev.completed_at.isoformat() if ev.completed_at else None,
        "failure_reason": ev.failure_reason,
        "input": {
            "prompt": ev.input.prompt,
            "prompt_language": ev.input.prompt_language,
            "prompt_translation": ev.input.prompt_translation,
            "image_url": ev.input.image_url,
            "image_filename": ev.input.image_filename,
            "image_mime": ev.input.image_mime,
            "image_size_bytes": ev.input.image_size_bytes,
            "image_width": ev.input.image_width,
            "image_height": ev.input.image_height,
        },
        "result": result,
        "cultural_findings": [finding(f, "cultural") for f in ev.cultural_findings],
        "safety_findings": [finding(f, "safety") for f in ev.safety_findings],
        "bias_findings": [finding(f, "bias") for f in ev.bias_findings],
    }


def list_item(ev):
    r = ev.result
    flags = sum(
        1
        for f in [*ev.cultural_findings, *ev.safety_findings, *ev.bias_findings]
        if f.severity in {"medium", "high", "critical"}
    )
    latest_review = max(ev.reviews, key=lambda x: x.created_at) if ev.reviews else None
    reviewed_by = latest_review.reviewer.full_name if latest_review and latest_review.reviewer else None
    return {
        "id": str(ev.id),
        "prompt": ev.input.prompt,
        "image_url": ev.input.image_url,
        "model_name": ev.model_name,
        "status": ev.status,
        "mode": ev.mode,
        "evaluation_focus": ev.evaluation_focus,
        "cultural_score": r.cultural_score if r else None,
        "safety_score": r.safety_score if r else None,
        "similarity_score": r.similarity_score if r else None,
        "bias_risk": r.bias_risk if r else None,
        "flags": flags,
        "reviewed_by": reviewed_by,
        "review_recommendation": r.review_recommendation if r else None,
        "created_at": ev.created_at.isoformat(),
        "completed_at": ev.completed_at.isoformat() if ev.completed_at else None,
    }


@router.post("")
def create(
    request: Request,
    prompt: str = Form(...),
    evaluation_focus: str = Form("balanced"),
    prompt_translation: str | None = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require("evaluation:create")),
):
    try:
        ev = EvaluationService(db).create_evaluation(
            ctx.workspace_id,
            ctx.user.id,
            prompt,
            image,
            evaluation_focus,
            prompt_translation,
        )
        return envelope(request, detail(ev))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("")
def list_all(
    request: Request,
    search: str | None = None,
    status: str | None = None,
    model: str | None = None,
    days: int | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    risk: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require("evaluation:view")),
):
    for score in (min_score, max_score):
        if score is not None and not 0 <= score <= 1:
            raise HTTPException(status_code=422, detail="Score filters must be between 0 and 1")
    if min_score is not None and max_score is not None and min_score > max_score:
        raise HTTPException(status_code=422, detail="min_score cannot exceed max_score")
    if risk and risk not in {"low", "medium", "high", "critical"}:
        raise HTTPException(status_code=422, detail="Unknown risk filter")
    items, total = EvaluationService(db).list_evaluations(
        ctx.workspace_id,
        search,
        status,
        model,
        days,
        min_score,
        max_score,
        risk,
        limit,
        offset,
    )
    return envelope(
        request,
        {"items": [list_item(x) for x in items], "total": total, "limit": limit, "offset": offset},
    )


@router.get("/{evaluation_id}")
def get_one(
    evaluation_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require("evaluation:view")),
):
    try:
        return envelope(request, detail(EvaluationService(db).get_evaluation(ctx.workspace_id, evaluation_id)))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="Evaluation not found") from exc


@router.get("/{evaluation_id}/results")
def get_results(
    evaluation_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require("evaluation:view")),
):
    try:
        ev = EvaluationService(db).get_evaluation(ctx.workspace_id, evaluation_id)
        return envelope(request, detail(ev)["result"])
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="Evaluation not found") from exc


@router.delete("/{evaluation_id}")
def delete(
    evaluation_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(require("evaluation:delete")),
):
    try:
        ev = EvaluationService(db).get_evaluation(ctx.workspace_id, evaluation_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="Evaluation not found") from exc
    audit(db, ctx.workspace_id, ctx.user.id, "evaluation.deleted", "evaluation", str(ev.id))
    db.delete(ev)
    db.commit()
    return envelope(request, {"deleted": True, "id": str(evaluation_id)})
