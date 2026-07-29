"""POST /crm/v1/auth/refresh — rotate refresh token and issue access JWT."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.audit import record_audit_event
from graphql.crm_auth.http_util import assign_refresh_token, ensure_aware, error_response
from graphql.crm_auth.jwt_access import issue_access_token
from graphql.crm_auth.tokens import hash_opaque_token
from graphql.data_sources.database import SessionLocal
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice


async def refresh_endpoint(request: Request) -> Response:
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")
    if not isinstance(body, dict):
        return error_response(400, "Invalid JSON body")

    raw_refresh = body.get("refreshToken")
    if not isinstance(raw_refresh, str) or not raw_refresh.strip():
        return error_response(400, "refreshToken is required")

    token_hash = hash_opaque_token(raw_refresh.strip())
    now = datetime.now(tz=UTC)
    session = SessionLocal()
    try:
        device = (
            session.query(CrmDevice).filter(CrmDevice.refresh_token_hash == token_hash).first()
        )
        if device is None:
            record_audit_event(session, event_type="refresh_fail", detail="invalid_token")
            session.commit()
            return error_response(401, "Invalid refresh token")

        customer = session.query(CrmCustomer).filter(CrmCustomer.id == device.customer_id).first()
        crm_app_id = customer.crm_app_id if customer else None

        def _fail(message: str, detail: str) -> JSONResponse:
            record_audit_event(
                session,
                event_type="refresh_fail",
                crm_app_id=crm_app_id,
                customer_id=device.customer_id,
                device_id=device.id,
                detail=detail,
            )
            session.commit()
            return error_response(401, message)

        if device.revoked_at is not None:
            return _fail("Device revoked", "revoked")
        if device.refresh_expires_at is None or ensure_aware(device.refresh_expires_at) <= now:
            return _fail("Refresh token expired", "expired")

        if customer is None:
            return error_response(500, "Customer not found")
        app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
        if app is None:
            return error_response(500, "CRM app not found")

        new_refresh = assign_refresh_token(device, now=now)
        device.last_seen_at = now
        access_token, expires_at = issue_access_token(
            customer_id=customer.id,
            device_id=device.id,
            app_id=app.app_id,
            now=now,
        )
        record_audit_event(
            session,
            event_type="refresh_ok",
            crm_app_id=app.id,
            customer_id=customer.id,
            device_id=device.id,
        )
        session.commit()

        return JSONResponse(
            {
                "accessToken": access_token,
                "expiresAt": expires_at.isoformat().replace("+00:00", "Z"),
                "refreshToken": new_refresh,
            },
            status_code=200,
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
