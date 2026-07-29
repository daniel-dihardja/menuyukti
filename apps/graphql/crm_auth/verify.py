"""POST /crm/v1/auth/verify — verify Ed25519 signature and issue access JWT."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.audit import record_audit_event
from graphql.crm_auth.crypto import verify_ed25519_signature
from graphql.crm_auth.http_util import ensure_aware, error_response
from graphql.crm_auth.jwt_access import issue_access_token
from graphql.data_sources.database import SessionLocal
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_auth_challenge import CrmAuthChallenge
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice


async def verify_endpoint(request: Request) -> Response:
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return error_response(400, "Invalid JSON body")
    if not isinstance(body, dict):
        return error_response(400, "Invalid JSON body")

    device_id_raw = body.get("deviceId")
    challenge_id_raw = body.get("challengeId")
    signature_raw = body.get("signature")

    if not isinstance(device_id_raw, str) or not device_id_raw.strip():
        return error_response(400, "deviceId is required")
    if not isinstance(challenge_id_raw, str) or not challenge_id_raw.strip():
        return error_response(400, "challengeId is required")
    if not isinstance(signature_raw, str) or not signature_raw.strip():
        return error_response(400, "signature is required")

    try:
        device_uuid = uuid.UUID(device_id_raw.strip())
        challenge_uuid = uuid.UUID(challenge_id_raw.strip())
    except ValueError:
        return error_response(400, "deviceId and challengeId must be valid UUIDs")

    now = datetime.now(tz=UTC)
    session = SessionLocal()
    try:
        device = session.query(CrmDevice).filter(CrmDevice.id == device_uuid).first()
        if device is None:
            return error_response(404, "Device not found")

        customer = session.query(CrmCustomer).filter(CrmCustomer.id == device.customer_id).first()
        crm_app_id = customer.crm_app_id if customer else None

        def _fail(message: str, detail: str, status: int = 401) -> JSONResponse:
            record_audit_event(
                session,
                event_type="verify_fail",
                crm_app_id=crm_app_id,
                customer_id=device.customer_id,
                device_id=device.id,
                detail=detail,
            )
            session.commit()
            return error_response(status, message)

        if device.revoked_at is not None:
            return _fail("Device revoked", "revoked")

        challenge = (
            session.query(CrmAuthChallenge)
            .filter(
                CrmAuthChallenge.id == challenge_uuid,
                CrmAuthChallenge.device_id == device.id,
            )
            .first()
        )
        if challenge is None:
            return _fail("Invalid challenge", "not_found")
        if challenge.consumed_at is not None:
            return _fail("Challenge already used", "consumed")
        if ensure_aware(challenge.expires_at) <= now:
            return _fail("Challenge expired", "expired")

        ok = verify_ed25519_signature(
            public_key_hex=device.public_key,
            message=challenge.nonce.encode("utf-8"),
            signature_hex=signature_raw.strip(),
        )
        if not ok:
            return _fail("Invalid signature", "bad_signature")

        if customer is None:
            return error_response(500, "Customer not found")
        app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
        if app is None:
            return error_response(500, "CRM app not found")

        challenge.consumed_at = now
        device.last_seen_at = now
        access_token, expires_at = issue_access_token(
            customer_id=customer.id,
            device_id=device.id,
            app_id=app.app_id,
            now=now,
        )
        record_audit_event(
            session,
            event_type="verify_ok",
            crm_app_id=app.id,
            customer_id=customer.id,
            device_id=device.id,
        )
        session.commit()

        return JSONResponse(
            {
                "accessToken": access_token,
                "expiresAt": expires_at.isoformat().replace("+00:00", "Z"),
            },
            status_code=200,
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
