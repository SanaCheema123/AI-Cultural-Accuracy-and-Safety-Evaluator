from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.ai.adapters.live_http import LiveMultimodalEvaluator
from app.core.config import get_settings
from app.evaluation.aggregation import aggregate
from app.models.entities import (
    BiasFinding,
    CulturalFinding,
    Evaluation,
    EvaluationInput,
    EvaluationResult,
    ExpertReview,
    ModelRun,
    SafetyFinding,
)
from app.services.audit import audit
from app.storage.local import LocalImageStorage

STEPS = [
    ("validating_request", 5),
    ("processing_prompt", 15),
    ("analyzing_image", 30),
    ("calculating_similarity", 45),
    ("checking_cultural_context", 60),
    ("running_safety_analysis", 72),
    ("checking_bias", 82),
    ("aggregating_results", 92),
    ("generating_report", 98),
    ("complete", 100),
]


class EvaluationService:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
        self.storage = LocalImageStorage()

    def _live_evaluator(self) -> LiveMultimodalEvaluator:
        if not self.settings.live_ai_configured:
            raise RuntimeError(
                "Gemini is not configured. Add GEMINI_API_KEY to the project .env file."
            )
        return LiveMultimodalEvaluator(
            endpoint=self.settings.gemini_endpoint,
            api_key=self.settings.gemini_api_key,
            model=self.settings.gemini_model,
            provider_name=self.settings.evaluation_provider_name,
            timeout_seconds=self.settings.gemini_timeout_seconds,
            json_mode=self.settings.gemini_json_mode,
        )

    def create_evaluation(
        self,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        prompt: str,
        image: UploadFile,
        focus: str = "balanced",
        prompt_translation: str | None = None,
    ) -> Evaluation:
        if not prompt.strip() or len(prompt) > 8000:
            raise ValueError("Prompt must be between 1 and 8000 characters")
        if focus not in {"balanced", "cultural_accuracy", "safety", "bias", "similarity"}:
            raise ValueError("Unknown evaluation focus")

        # Fail before persisting an evaluation when no real provider is connected.
        self._live_evaluator()

        stored = self.storage.save(image)
        ev = Evaluation(
            workspace_id=workspace_id,
            user_id=user_id,
            model_name=self.settings.evaluation_model_name,
            status="processing",
            mode="live",
            evaluation_focus=focus,
            progress_step="validating_request",
            progress_percent=5,
        )
        self.db.add(ev)
        self.db.flush()
        inp = EvaluationInput(
            evaluation_id=ev.id,
            prompt=prompt.strip(),
            prompt_language="ar",
            prompt_translation=prompt_translation,
            image_url=stored.public_url,
            image_filename=stored.filename,
            image_mime=stored.mime,
            image_size_bytes=stored.size_bytes,
            image_width=stored.width,
            image_height=stored.height,
            image_sha256=stored.sha256,
        )
        self.db.add(inp)
        audit(
            self.db,
            workspace_id,
            user_id,
            "evaluation.created",
            "evaluation",
            str(ev.id),
            {"mode": "live", "model": ev.model_name, "provider": self.settings.evaluation_provider_name},
        )
        self.db.commit()

        try:
            self.process_evaluation(ev.id)
        except Exception as exc:
            failed = self.db.get(Evaluation, ev.id)
            if failed:
                failed.status = "failed"
                failed.failure_reason = str(exc)[:1000] or "Evaluation processing failed"
                self.db.commit()
            raise
        return self.get_evaluation(workspace_id, ev.id)

    def process_evaluation(self, evaluation_id: uuid.UUID) -> None:
        ev = self.db.scalar(
            select(Evaluation)
            .options(selectinload(Evaluation.input))
            .where(Evaluation.id == evaluation_id)
        )
        if not ev:
            raise ValueError("Evaluation not found")

        def progress(step: str, pct: int) -> None:
            ev.progress_step = step
            ev.progress_percent = pct
            self.db.commit()

        image_path = str(self.storage.root / ev.input.image_url.split("/")[-1])
        evaluator = self._live_evaluator()

        progress("processing_prompt", 15)
        progress("analyzing_image", 30)
        started = time.perf_counter()
        bundle = evaluator.evaluate(
            prompt=ev.input.prompt,
            image_path=image_path,
            focus=ev.evaluation_focus,
            prompt_translation=ev.input.prompt_translation,
        )
        provider_ms = int((time.perf_counter() - started) * 1000)

        ev.input.prompt_language = bundle.language["language"]
        ev.input.normalized_prompt = bundle.language["normalized_text"]

        progress("calculating_similarity", 45)
        similarity = bundle.similarity
        progress("checking_cultural_context", 60)
        culture = bundle.cultural
        culture_findings = bundle.cultural_findings
        progress("running_safety_analysis", 72)
        safety = bundle.safety
        safety_findings = bundle.safety_findings
        progress("checking_bias", 82)
        bias = bundle.bias
        bias_findings = bundle.bias_findings

        progress("aggregating_results", 92)
        agg = aggregate(similarity, culture, safety, bias)
        result = EvaluationResult(
            evaluation_id=ev.id,
            similarity_score=similarity.score,
            similarity_confidence=similarity.confidence,
            similarity_status=similarity.status,
            cultural_score=culture.score,
            cultural_confidence=culture.confidence,
            safety_score=safety.score,
            safety_confidence=safety.confidence,
            bias_risk=agg.bias_risk,
            bias_confidence=bias.confidence,
            overall_status=agg.overall_status,
            overall_confidence=agg.overall_confidence,
            review_recommendation=agg.review_recommendation,
            summary=agg.summary,
            limitations=(
                "This evaluation was produced by the configured live multimodal model. "
                "Automated cultural, safety, and bias assessments can be incomplete or contestable; "
                "review uncertain or high-impact cases with qualified humans."
            ),
        )
        self.db.add(result)

        for finding in culture_findings:
            self.db.add(
                CulturalFinding(
                    evaluation_id=ev.id,
                    category=finding.category,
                    severity=finding.severity,
                    confidence=finding.confidence,
                    evidence=finding.evidence,
                    explanation=finding.explanation,
                    recommendation=finding.recommendation,
                    status=finding.status,
                    uncertainty=finding.uncertainty,
                )
            )
        for finding in safety_findings:
            self.db.add(
                SafetyFinding(
                    evaluation_id=ev.id,
                    category=finding.category,
                    severity=finding.severity,
                    confidence=finding.confidence,
                    evidence=finding.evidence,
                    explanation=finding.explanation,
                    recommendation=finding.recommendation,
                    status=finding.status,
                    risk_level=finding.risk_level,
                )
            )
        for finding in bias_findings:
            self.db.add(
                BiasFinding(
                    evaluation_id=ev.id,
                    category=finding.category,
                    severity=finding.severity,
                    confidence=finding.confidence,
                    evidence=finding.evidence,
                    explanation=finding.explanation,
                    recommendation=finding.recommendation,
                    status=finding.status,
                    finding=finding.finding,
                )
            )

        metrics = [
            ("similarity", similarity.score, similarity.confidence, provider_ms),
            ("cultural_accuracy", culture.score, culture.confidence, 0),
            ("safety", safety.score, safety.confidence, 0),
            ("bias_safety", bias.score, bias.confidence, 0),
        ]
        for metric, score, confidence, processing_ms in metrics:
            self.db.add(
                ModelRun(
                    evaluation_id=ev.id,
                    model_name=ev.model_name,
                    metric_type=metric,
                    score=score,
                    confidence=confidence,
                    processing_ms=processing_ms,
                    output_json={
                        "mode": "live",
                        "provider": self.settings.evaluation_provider_name,
                        "model": ev.model_name,
                    },
                )
            )

        progress("generating_report", 98)
        ev.status = "completed"
        ev.progress_step = "complete"
        ev.progress_percent = 100
        ev.completed_at = datetime.now(timezone.utc)
        audit(
            self.db,
            ev.workspace_id,
            ev.user_id,
            "evaluation.completed",
            "evaluation",
            str(ev.id),
            {"overall_status": agg.overall_status, "mode": "live", "model": ev.model_name},
        )
        self.db.commit()

    def get_evaluation(self, workspace_id: uuid.UUID, evaluation_id: uuid.UUID) -> Evaluation:
        ev = self.db.scalar(
            select(Evaluation)
            .options(
                selectinload(Evaluation.input),
                selectinload(Evaluation.result),
                selectinload(Evaluation.cultural_findings),
                selectinload(Evaluation.safety_findings),
                selectinload(Evaluation.bias_findings),
                selectinload(Evaluation.reviews),
                selectinload(Evaluation.model_runs),
            )
            .where(Evaluation.id == evaluation_id, Evaluation.workspace_id == workspace_id)
        )
        if not ev:
            raise LookupError("Evaluation not found")
        return ev

    def list_evaluations(
        self,
        workspace_id: uuid.UUID,
        search: str | None = None,
        status: str | None = None,
        model: str | None = None,
        days: int | None = None,
        min_score: float | None = None,
        max_score: float | None = None,
        risk: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ):
        stmt = (
            select(Evaluation)
            .options(
                selectinload(Evaluation.input),
                selectinload(Evaluation.result),
                selectinload(Evaluation.cultural_findings),
                selectinload(Evaluation.safety_findings),
                selectinload(Evaluation.bias_findings),
                selectinload(Evaluation.reviews).selectinload(ExpertReview.reviewer),
            )
            .where(Evaluation.workspace_id == workspace_id)
        )
        if status:
            stmt = stmt.where(Evaluation.status == status)
        if model:
            stmt = stmt.where(Evaluation.model_name == model)
        if days is not None:
            days = max(1, min(days, 3650))
            stmt = stmt.where(Evaluation.created_at >= datetime.now(timezone.utc) - timedelta(days=days))
        if min_score is not None:
            stmt = stmt.where(Evaluation.result.has(EvaluationResult.cultural_score >= min_score))
        if max_score is not None:
            stmt = stmt.where(Evaluation.result.has(EvaluationResult.cultural_score <= max_score))
        if risk:
            stmt = stmt.where(Evaluation.result.has(EvaluationResult.bias_risk == risk))
        if search:
            stmt = stmt.join(EvaluationInput).where(
                or_(
                    EvaluationInput.prompt.ilike(f"%{search}%"),
                    Evaluation.model_name.ilike(f"%{search}%"),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        items = self.db.scalars(
            stmt.order_by(Evaluation.created_at.desc()).limit(min(limit, 100)).offset(offset)
        ).unique().all()
        return items, total
