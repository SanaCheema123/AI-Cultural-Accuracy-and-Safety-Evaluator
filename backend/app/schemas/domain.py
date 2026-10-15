from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AuthRegister(BaseModel):
    email: str
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=2, max_length=160)

    @field_validator("email")
    @classmethod
    def email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v):
            raise ValueError("Invalid email address")
        return v


class AuthLogin(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(ORMModel):
    id: uuid.UUID
    email: str
    full_name: str
    preferred_language: str
    theme: str


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
    workspace_id: uuid.UUID
    role: str


class FindingOut(ORMModel):
    id: uuid.UUID
    category: str
    severity: str
    confidence: float
    evidence: str
    explanation: str
    recommendation: str
    status: str


class CulturalFindingOut(FindingOut):
    uncertainty: str


class SafetyFindingOut(FindingOut):
    risk_level: str


class BiasFindingOut(FindingOut):
    finding: str


class EvaluationResultOut(ORMModel):
    id: uuid.UUID
    similarity_score: float
    similarity_confidence: float
    similarity_status: str
    cultural_score: float
    cultural_confidence: float
    safety_score: float
    safety_confidence: float
    bias_risk: str
    bias_confidence: float
    overall_status: str
    overall_confidence: float
    review_recommendation: str
    summary: str
    limitations: str


class EvaluationInputOut(ORMModel):
    prompt: str
    prompt_language: str
    prompt_translation: str | None
    image_url: str
    image_filename: str
    image_mime: str
    image_size_bytes: int
    image_width: int | None
    image_height: int | None


class EvaluationListItem(BaseModel):
    id: uuid.UUID
    prompt: str
    image_url: str
    model_name: str
    status: str
    mode: str
    evaluation_focus: str
    cultural_score: float | None = None
    safety_score: float | None = None
    similarity_score: float | None = None
    bias_risk: str | None = None
    flags: int = 0
    review_recommendation: str | None = None
    created_at: datetime
    completed_at: datetime | None


class EvaluationDetail(BaseModel):
    id: uuid.UUID
    model_name: str
    status: str
    mode: str
    evaluation_focus: str
    progress_step: str
    progress_percent: int
    created_at: datetime
    completed_at: datetime | None
    input: EvaluationInputOut
    result: EvaluationResultOut | None = None
    cultural_findings: list[CulturalFindingOut] = []
    safety_findings: list[SafetyFindingOut] = []
    bias_findings: list[BiasFindingOut] = []


class ReviewCreate(BaseModel):
    decision: Literal["confirm", "reject", "modify", "re_evaluate", "approve", "escalate"]
    severity_override: Literal["low", "medium", "high", "critical"] | None = None
    comment: str = Field(default="", max_length=4000)
    explanation: str = Field(default="", max_length=8000)
    annotations: list[dict[str, Any]] = []


class ReviewOut(ORMModel):
    id: uuid.UUID
    evaluation_id: uuid.UUID
    reviewer_id: uuid.UUID
    decision: str
    previous_decision: str | None
    severity_override: str | None
    comment: str
    explanation: str
    created_at: datetime
    updated_at: datetime


class DatasetCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=4000)
    language: str = Field(default="ar", max_length=16)
    tags: list[str] = []


class DatasetItemCreate(BaseModel):
    prompt: str = Field(min_length=1, max_length=8000)
    image_url: str | None = None
    tags: list[str] = []
    metadata: dict[str, Any] = {}


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class TeamInvite(BaseModel):
    email: str
    role: Literal["admin", "evaluator", "reviewer", "viewer"]


class UserPreferences(BaseModel):
    preferred_language: Literal["en", "ar"] | None = None
    theme: Literal["light", "dark", "system"] | None = None


class AnalyticsFilters(BaseModel):
    days: int = Field(default=30, ge=1, le=365)


class ModelComparisonRequest(BaseModel):
    evaluation_ids: list[uuid.UUID] = Field(min_length=1, max_length=20)

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20)
    password: str = Field(min_length=10, max_length=128)
