"""POST /crm/v1/auth/revoke — self-revoke current device."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.audit import record_audit_event
from graphql.crm_auth.http_util import (
    AccessClaims,
    bearer_token_from_request,
    clear_refresh_token,
    decode_access_claims,
    error_response,
)
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
    bearer_token = bearer_token_from_request(request)

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
                session.query(CrmDevice).filter(CrmDevice.refresh_token_hash == token_hash).first()
            )
            if device is None:
                return error_response(401, "Invalid refresh token")
        else:
            assert bearer_token is not None
            claims_or_error = decode_access_claims(bearer_token)
            if isinstance(claims_or_error, JSONResponse):
                return claims_or_error
            claims: AccessClaims = claims_or_error
            device = session.query(CrmDevice).filter(CrmDevice.id == claims.did).first()
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
