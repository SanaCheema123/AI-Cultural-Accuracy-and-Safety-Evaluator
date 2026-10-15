from __future__ import annotations
import time, uuid
from collections import defaultdict, deque
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from .config import get_settings

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'"
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.limit = get_settings().rate_limit_per_minute
        self.buckets: dict[str, deque[float]] = defaultdict(deque)
    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health","/ready"}: return await call_next(request)
        key = request.client.host if request.client else "unknown"
        now = time.monotonic(); q = self.buckets[key]
        while q and now-q[0] > 60: q.popleft()
        if len(q) >= self.limit:
            return JSONResponse(status_code=429, content={"success":False,"data":None,"error":{"code":"rate_limited","message":"Too many requests"},"request_id":getattr(request.state,"request_id",None)})
        q.append(now)
        return await call_next(request)
