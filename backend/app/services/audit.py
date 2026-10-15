from __future__ import annotations
import uuid
from typing import Any
from sqlalchemy.orm import Session
from app.models.entities import AuditLog

def audit(db: Session, workspace_id: uuid.UUID, actor_id: uuid.UUID | None, action: str, resource_type: str, resource_id: str | None = None, metadata: dict[str,Any] | None = None) -> None:
    db.add(AuditLog(workspace_id=workspace_id,actor_id=actor_id,action=action,resource_type=resource_type,resource_id=resource_id,metadata_json=metadata or {}))
