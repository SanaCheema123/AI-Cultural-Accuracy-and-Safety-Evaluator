from __future__ import annotations
from typing import Any
from fastapi import Request

def envelope(request: Request, data: Any = None, error: Any = None, success: bool | None = None) -> dict[str, Any]:
    return {
        "success": error is None if success is None else success,
        "data": data,
        "error": error,
        "request_id": getattr(request.state, "request_id", None),
    }
