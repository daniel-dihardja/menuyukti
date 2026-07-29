"""Shared HTTP helpers for CRM REST auth endpoints."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from starlette.requests import Request
from starlette.responses import JSONResponse

from graphql.crm_auth.jwt_access import decode_access_token
from graphql.crm_auth.tokens import generate_refresh_token, hash_opaque_token
from graphql.data_sources.models.crm_device import CrmDevice

REFRESH_TOKEN_TTL = timedelta(days=30)
CHALLENGE_TTL = timedelta(minutes=2)


def error_response(status: int, message: str) -> JSONResponse:
    return JSONResponse({"message": message}, status_code=status)


@dataclass(frozen=True)
class AccessClaims:
    sub: uuid.UUID
    did: uuid.UUID
    app_id: uuid.UUID
    raw: dict[str, Any]


def bearer_token_from_request(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None
    token = auth_header[7:].strip()
    return token or None


def decode_access_claims(token: str) -> AccessClaims | JSONResponse:
    """
    Decode a Bearer access JWT into typed claims.

    Returns ``AccessClaims`` on success, or a 401 ``JSONResponse`` on failure.
    """
    try:
        claims = decode_access_token(token)
    except jwt.PyJWTError:
        return error_response(401, "Invalid access token")

    sub_raw = claims.get("sub")
    did_raw = claims.get("did")
    app_id_raw = claims.get("app_id")
    if (
        not isinstance(sub_raw, str)
        or not isinstance(did_raw, str)
        or not isinstance(app_id_raw, str)
    ):
        return error_response(401, "Invalid access token")

    try:
        return AccessClaims(
            sub=uuid.UUID(sub_raw),
            did=uuid.UUID(did_raw),
            app_id=uuid.UUID(app_id_raw),
            raw=claims,
        )
    except ValueError:
        return error_response(401, "Invalid access token")


def require_access_claims(request: Request) -> AccessClaims | JSONResponse:
    """Require ``Authorization: Bearer`` and return typed claims or a 401 response."""
    token = bearer_token_from_request(request)
    if token is None:
        return error_response(401, "Authorization Bearer token is required")
    return decode_access_claims(token)


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
