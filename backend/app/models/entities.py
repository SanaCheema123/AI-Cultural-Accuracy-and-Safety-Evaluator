from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.core.db import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class Organization(Base, IdMixin, TimestampMixin):
    __tablename__ = "organizations"
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(40), default="starter")
    workspaces: Mapped[list["Workspace"]] = relationship(back_populates="organization", cascade="all, delete-orphan")


class Workspace(Base, IdMixin, TimestampMixin):
    __tablename__ = "workspaces"
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(160), default="Default Workspace")
    slug: Mapped[str] = mapped_column(String(160), index=True)
    settings_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    organization: Mapped[Organization] = relationship(back_populates="workspaces")
    memberships: Mapped[list["Membership"]] = relationship(back_populates="workspace", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("organization_id", "slug", name="uq_workspace_org_slug"),)


class User(Base, IdMixin, TimestampMixin):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512))
    full_name: Mapped[str] = mapped_column(String(160))
    preferred_language: Mapped[str] = mapped_column(String(8), default="en")
    theme: Mapped[str] = mapped_column(String(16), default="system")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    memberships: Mapped[list["Membership"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Membership(Base, IdMixin, TimestampMixin):
    __tablename__ = "memberships"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32), default="viewer", index=True)
    workspace: Mapped[Workspace] = relationship(back_populates="memberships")
    user: Mapped[User] = relationship(back_populates="memberships")
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_membership_workspace_user"),)


class Role(Base, IdMixin, TimestampMixin):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String(64), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")


class Permission(Base, IdMixin, TimestampMixin):
    __tablename__ = "permissions"
    name: Mapped[str] = mapped_column(String(96), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")


class ModelDefinition(Base, IdMixin, TimestampMixin):
    __tablename__ = "models"
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    provider: Mapped[str] = mapped_column(String(80), default="live-http")
    model_type: Mapped[str] = mapped_column(String(40), default="multimodal")
    is_configured: Mapped[bool] = mapped_column(Boolean, default=False)
    config_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class Evaluation(Base, IdMixin, TimestampMixin):
    __tablename__ = "evaluations"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    model_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("models.id", ondelete="SET NULL"), nullable=True, index=True)
    model_name: Mapped[str] = mapped_column(String(120), default="Live AI model")
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    mode: Mapped[str] = mapped_column(String(24), default="live")
    evaluation_focus: Mapped[str] = mapped_column(String(32), default="balanced")
    progress_step: Mapped[str] = mapped_column(String(80), default="queued")
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    input: Mapped["EvaluationInput"] = relationship(back_populates="evaluation", uselist=False, cascade="all, delete-orphan")
    result: Mapped["EvaluationResult"] = relationship(back_populates="evaluation", uselist=False, cascade="all, delete-orphan")
    cultural_findings: Mapped[list["CulturalFinding"]] = relationship(back_populates="evaluation", cascade="all, delete-orphan")
    safety_findings: Mapped[list["SafetyFinding"]] = relationship(back_populates="evaluation", cascade="all, delete-orphan")
    bias_findings: Mapped[list["BiasFinding"]] = relationship(back_populates="evaluation", cascade="all, delete-orphan")
    reviews: Mapped[list["ExpertReview"]] = relationship(back_populates="evaluation", cascade="all, delete-orphan")
    model_runs: Mapped[list["ModelRun"]] = relationship(back_populates="evaluation", cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_eval_workspace_created", "workspace_id", "created_at"),
        Index("ix_eval_workspace_status", "workspace_id", "status"),
    )


class EvaluationInput(Base, IdMixin, TimestampMixin):
    __tablename__ = "evaluation_inputs"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), unique=True, index=True)
    prompt: Mapped[str] = mapped_column(Text)
    prompt_language: Mapped[str] = mapped_column(String(16), default="ar")
    prompt_translation: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str] = mapped_column(String(1024))
    image_filename: Mapped[str] = mapped_column(String(255))
    image_mime: Mapped[str] = mapped_column(String(120))
    image_size_bytes: Mapped[int] = mapped_column(Integer)
    image_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image_sha256: Mapped[str] = mapped_column(String(64), index=True)
    evaluation: Mapped[Evaluation] = relationship(back_populates="input")


class EvaluationResult(Base, IdMixin, TimestampMixin):
    __tablename__ = "evaluation_results"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), unique=True, index=True)
    similarity_score: Mapped[float] = mapped_column(Float)
    similarity_confidence: Mapped[float] = mapped_column(Float)
    similarity_status: Mapped[str] = mapped_column(String(48))
    cultural_score: Mapped[float] = mapped_column(Float)
    cultural_confidence: Mapped[float] = mapped_column(Float)
    safety_score: Mapped[float] = mapped_column(Float)
    safety_confidence: Mapped[float] = mapped_column(Float)
    bias_risk: Mapped[str] = mapped_column(String(24))
    bias_confidence: Mapped[float] = mapped_column(Float)
    overall_status: Mapped[str] = mapped_column(String(32), index=True)
    overall_confidence: Mapped[float] = mapped_column(Float)
    review_recommendation: Mapped[str] = mapped_column(String(48))
    summary: Mapped[str] = mapped_column(Text)
    limitations: Mapped[str] = mapped_column(Text, default="Automated evaluation is probabilistic and may require human validation.")
    evaluation: Mapped[Evaluation] = relationship(back_populates="result")


class FindingMixin:
    category: Mapped[str] = mapped_column(String(96), index=True)
    severity: Mapped[str] = mapped_column(String(24), index=True)
    confidence: Mapped[float] = mapped_column(Float)
    evidence: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    recommendation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="reviewed_by_model")


class CulturalFinding(Base, IdMixin, TimestampMixin, FindingMixin):
    __tablename__ = "cultural_findings"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    uncertainty: Mapped[str] = mapped_column(Text, default="Cultural context may vary by region, community, and historical period.")
    evaluation: Mapped[Evaluation] = relationship(back_populates="cultural_findings")


class SafetyFinding(Base, IdMixin, TimestampMixin, FindingMixin):
    __tablename__ = "safety_findings"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    risk_level: Mapped[str] = mapped_column(String(24), default="low")
    evaluation: Mapped[Evaluation] = relationship(back_populates="safety_findings")


class BiasFinding(Base, IdMixin, TimestampMixin, FindingMixin):
    __tablename__ = "bias_findings"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    finding: Mapped[str] = mapped_column(Text, default="")
    evaluation: Mapped[Evaluation] = relationship(back_populates="bias_findings")


class ModelRun(Base, IdMixin, TimestampMixin):
    __tablename__ = "model_runs"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    model_name: Mapped[str] = mapped_column(String(120), index=True)
    metric_type: Mapped[str] = mapped_column(String(80), index=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    processing_ms: Mapped[int] = mapped_column(Integer, default=0)
    output_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    evaluation: Mapped[Evaluation] = relationship(back_populates="model_runs")


class ExpertReview(Base, IdMixin, TimestampMixin):
    __tablename__ = "expert_reviews"
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    reviewer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    reviewer: Mapped["User"] = relationship(foreign_keys=[reviewer_id])
    decision: Mapped[str] = mapped_column(String(40), index=True)
    previous_decision: Mapped[str | None] = mapped_column(String(40), nullable=True)
    severity_override: Mapped[str | None] = mapped_column(String(24), nullable=True)
    comment: Mapped[str] = mapped_column(Text, default="")
    explanation: Mapped[str] = mapped_column(Text, default="")
    evaluation: Mapped[Evaluation] = relationship(back_populates="reviews")
    annotations: Mapped[list["ReviewAnnotation"]] = relationship(back_populates="review", cascade="all, delete-orphan")


class ReviewAnnotation(Base, IdMixin, TimestampMixin):
    __tablename__ = "review_annotations"
    review_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("expert_reviews.id", ondelete="CASCADE"), index=True)
    finding_type: Mapped[str] = mapped_column(String(32))
    finding_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), nullable=True)
    note: Mapped[str] = mapped_column(Text)
    review: Mapped[ExpertReview] = relationship(back_populates="annotations")


class Dataset(Base, IdMixin, TimestampMixin):
    __tablename__ = "datasets"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(16), default="ar")
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    tags_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    items: Mapped[list["DatasetItem"]] = relationship(back_populates="dataset", cascade="all, delete-orphan")


class DatasetItem(Base, IdMixin, TimestampMixin):
    __tablename__ = "dataset_items"
    dataset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    tags_json: Mapped[list[str]] = mapped_column(JSON, default=list)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    dataset: Mapped[Dataset] = relationship(back_populates="items")


class Report(Base, IdMixin, TimestampMixin):
    __tablename__ = "reports"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    evaluation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    generated_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="ready", index=True)
    format: Mapped[str] = mapped_column(String(16), default="pdf")
    file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    snapshot_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class Notification(Base, IdMixin, TimestampMixin):
    __tablename__ = "notifications"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    body: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(48), default="system")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class APIKey(Base, IdMixin, TimestampMixin):
    __tablename__ = "api_keys"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    created_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    prefix: Mapped[str] = mapped_column(String(32), index=True)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Subscription(Base, IdMixin, TimestampMixin):
    __tablename__ = "subscriptions"
    organization_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    plan: Mapped[str] = mapped_column(String(40), default="starter")
    status: Mapped[str] = mapped_column(String(32), default="active")
    provider: Mapped[str | None] = mapped_column(String(80), nullable=True)
    provider_customer_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    usage_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)


class AuditLog(Base, IdMixin):
    __tablename__ = "audit_logs"
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    resource_type: Mapped[str] = mapped_column(String(80), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


Index("ix_audit_workspace_created", AuditLog.workspace_id, AuditLog.created_at)

class PasswordResetToken(Base, IdMixin, TimestampMixin):
    __tablename__ = "password_reset_tokens"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
