"""Access JWT issue and decode for CRM customer devices."""

from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

ACCESS_TOKEN_TTL = timedelta(minutes=15)
_MIN_SECRET_LEN = 32
_ALGORITHM = "HS256"


def _jwt_secret() -> str:
    secret = os.environ.get("CRM_JWT_SECRET", "").strip()
    if len(secret) < _MIN_SECRET_LEN:
        raise RuntimeError(
            f"CRM_JWT_SECRET must be set to at least {_MIN_SECRET_LEN} characters"
        )
    return secret


def issue_access_token(
    *,
    customer_id: uuid.UUID,
    device_id: uuid.UUID,
    app_id: uuid.UUID,
    now: datetime | None = None,
) -> tuple[str, datetime]:
    """
    Issue a short-lived HS256 access JWT.

    Claims: ``sub`` (customer), ``did`` (device), ``app_id`` (public CRM app UUID), ``exp``.
    Returns ``(token, expires_at)``.
    """
    issued_at = now if now is not None else datetime.now(tz=UTC)
    expires_at = issued_at + ACCESS_TOKEN_TTL
    payload = {
        "sub": str(customer_id),
        "did": str(device_id),
        "app_id": str(app_id),
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, _jwt_secret(), algorithm=_ALGORITHM)
    return token, expires_at


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate an access JWT. Raises ``jwt.PyJWTError`` on failure."""
    return jwt.decode(token, _jwt_secret(), algorithms=[_ALGORITHM])
