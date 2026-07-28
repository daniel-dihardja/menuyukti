"""POST /crm/v1/auth/challenge — issue a nonce for device signature."""

from __future__ import annotations

import json
import secrets
import uuid
from datetime import UTC, datetime

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.audit import record_audit_event
from graphql.crm_auth.http_util import CHALLENGE_TTL, error_response
from graphql.data_sources.database import SessionLocal
from graphql.data_sources.models.crm_auth_challenge import CrmAuthChallenge
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice


async def challenge_endpoint(request: Request) -> Response:
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")
    if not isinstance(body, dict):
        return error_response(400, "Invalid JSON body")

    device_id_raw = body.get("deviceId")
    if not isinstance(device_id_raw, str) or not device_id_raw.strip():
        return error_response(400, "deviceId is required")
    try:
        device_uuid = uuid.UUID(device_id_raw.strip())
    except ValueError:
        return error_response(400, "deviceId must be a valid UUID")

    now = datetime.now(tz=UTC)
    session = SessionLocal()
    try:
        device = session.query(CrmDevice).filter(CrmDevice.id == device_uuid).first()
        if device is None:
            return error_response(404, "Device not found")
        if device.revoked_at is not None:
            record_audit_event(
                session,
                event_type="challenge_fail",
                customer_id=device.customer_id,
                device_id=device.id,
                detail="revoked",
            )
            session.commit()
            return error_response(401, "Device revoked")

        customer = session.query(CrmCustomer).filter(CrmCustomer.id == device.customer_id).first()
        nonce = secrets.token_urlsafe(32)
        expires_at = now + CHALLENGE_TTL
        challenge = CrmAuthChallenge(
            device_id=device.id,
            nonce=nonce,
            expires_at=expires_at,
        )
        session.add(challenge)
        record_audit_event(
            session,
            event_type="challenge",
            crm_app_id=customer.crm_app_id if customer else None,
            customer_id=device.customer_id,
            device_id=device.id,
        )
        session.commit()
        session.refresh(challenge)

        return JSONResponse(
            {
                "challengeId": str(challenge.id),
                "nonce": challenge.nonce,
                "expiresAt": expires_at.isoformat().replace("+00:00", "Z"),
            },
            status_code=200,
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
