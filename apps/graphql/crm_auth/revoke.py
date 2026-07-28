"""POST /crm/v1/auth/revoke — self-revoke current device."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import jwt
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.audit import record_audit_event
from graphql.crm_auth.http_util import clear_refresh_token, error_response
from graphql.crm_auth.jwt_access import decode_access_token
from graphql.crm_auth.tokens import hash_opaque_token
from graphql.data_sources.database import SessionLocal
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice


async def revoke_endpoint(request: Request) -> Response:
    try:
        body = await request.json()
    except json.JSONDecodeError:
        body = {}
    if body is None:
        body = {}
    if not isinstance(body, dict):
        return error_response(400, "Invalid JSON body")

    raw_refresh = body.get("refreshToken")
    auth_header = request.headers.get("Authorization", "")
    bearer_token: str | None = None
    if auth_header.lower().startswith("bearer "):
        bearer_token = auth_header[7:].strip() or None

    has_refresh = isinstance(raw_refresh, str) and bool(raw_refresh.strip())
    if not has_refresh and not bearer_token:
        return error_response(400, "refreshToken or Authorization Bearer token is required")

    now = datetime.now(tz=UTC)
    session = SessionLocal()
    try:
        device: CrmDevice | None = None

        if has_refresh:
            token_hash = hash_opaque_token(raw_refresh.strip())  # type: ignore[union-attr]
            device = (
                session.query(CrmDevice)
                .filter(CrmDevice.refresh_token_hash == token_hash)
                .first()
            )
            if device is None:
                return error_response(401, "Invalid refresh token")
        else:
            assert bearer_token is not None
            try:
                claims = decode_access_token(bearer_token)
            except jwt.PyJWTError:
                return error_response(401, "Invalid access token")
            did = claims.get("did")
            if not isinstance(did, str):
                return error_response(401, "Invalid access token")
            try:
                device_uuid = uuid.UUID(did)
            except ValueError:
                return error_response(401, "Invalid access token")
            device = session.query(CrmDevice).filter(CrmDevice.id == device_uuid).first()
            if device is None:
                return error_response(404, "Device not found")

        customer = session.query(CrmCustomer).filter(CrmCustomer.id == device.customer_id).first()
        if device.revoked_at is None:
            device.revoked_at = now
        clear_refresh_token(device)
        record_audit_event(
            session,
            event_type="revoke",
            crm_app_id=customer.crm_app_id if customer else None,
            customer_id=device.customer_id,
            device_id=device.id,
        )
        session.commit()
        return JSONResponse({"ok": True}, status_code=200)
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
