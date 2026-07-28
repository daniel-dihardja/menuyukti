"""Shared HTTP helpers for CRM REST auth endpoints."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from starlette.responses import JSONResponse

from graphql.crm_auth.tokens import generate_refresh_token, hash_opaque_token
from graphql.data_sources.models.crm_device import CrmDevice

REFRESH_TOKEN_TTL = timedelta(days=30)
CHALLENGE_TTL = timedelta(minutes=2)


def error_response(status: int, message: str) -> JSONResponse:
    return JSONResponse({"message": message}, status_code=status)


def ensure_aware(dt: object) -> datetime:
    """Normalize DB datetimes that may be naive (SQLite tests)."""
    if not isinstance(dt, datetime):
        raise TypeError("expected datetime")
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


def assign_refresh_token(device: CrmDevice, *, now: datetime | None = None) -> str:
    """Generate a refresh token, store its hash on ``device``, return the raw token."""
    issued_at = now if now is not None else datetime.now(tz=UTC)
    raw = generate_refresh_token()
    device.refresh_token_hash = hash_opaque_token(raw)
    device.refresh_expires_at = issued_at + REFRESH_TOKEN_TTL
    return raw


def clear_refresh_token(device: CrmDevice) -> None:
    device.refresh_token_hash = None
    device.refresh_expires_at = None
