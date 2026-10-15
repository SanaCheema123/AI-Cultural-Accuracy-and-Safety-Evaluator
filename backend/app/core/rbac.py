from __future__ import annotations
from enum import StrEnum

class Role(StrEnum):
    OWNER="owner"; ADMIN="admin"; EVALUATOR="evaluator"; REVIEWER="reviewer"; VIEWER="viewer"

PERMISSIONS: dict[str, set[str]] = {
    Role.OWNER: {"*"},
    Role.ADMIN: {"evaluation:view","evaluation:create","evaluation:delete","review:create","report:export","dataset:manage","api_key:manage","team:manage","billing:view","settings:manage"},
    Role.EVALUATOR: {"evaluation:view","evaluation:create","report:export","dataset:manage"},
    Role.REVIEWER: {"evaluation:view","review:create","report:export"},
    Role.VIEWER: {"evaluation:view"},
}

def has_permission(role: str, permission: str) -> bool:
    perms = PERMISSIONS.get(role, set())
    return "*" in perms or permission in perms
