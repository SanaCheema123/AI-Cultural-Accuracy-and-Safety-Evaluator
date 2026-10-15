from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from .config import get_settings

PBKDF2_ITERATIONS = 310_000


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, iterations, salt_b64, digest_b64 = encoded.split("$", 3)
        if scheme != "pbkdf2_sha256": return False
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64url(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def create_token(subject: str, token_type: str = "access", extra: dict[str, Any] | None = None) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    ttl = timedelta(minutes=s.jwt_access_minutes) if token_type == "access" else timedelta(days=s.jwt_refresh_days)
    header = {"alg": "HS256", "typ": "JWT"}
    payload: dict[str, Any] = {"sub": subject, "type": token_type, "iat": int(now.timestamp()), "exp": int((now+ttl).timestamp())}
    if extra: payload.update(extra)
    encoded = f"{_b64url(json.dumps(header,separators=(',',':')).encode())}.{_b64url(json.dumps(payload,separators=(',',':')).encode())}"
    sig = hmac.new(s.jwt_secret.encode(), encoded.encode(), hashlib.sha256).digest()
    return f"{encoded}.{_b64url(sig)}"


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    s = get_settings()
    try:
        h, p, sig = token.split(".")
        signed = f"{h}.{p}"
        expected = hmac.new(s.jwt_secret.encode(), signed.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64url(sig)):
            raise ValueError("invalid signature")
        payload = json.loads(_unb64url(p))
        if payload.get("exp", 0) < int(time.time()): raise ValueError("expired")
        if payload.get("type") != expected_type: raise ValueError("wrong token type")
        return payload
    except Exception as exc:
        raise ValueError("invalid token") from exc


def new_api_key() -> tuple[str, str, str]:
    prefix = "cg_live_"
    secret = prefix + secrets.token_urlsafe(32)
    return secret, secret[:16], hashlib.sha256(secret.encode()).hexdigest()
