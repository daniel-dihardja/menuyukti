"""POST /crm/v1/enroll — passwordless device enrollment."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.tokens import hash_enrollment_token, normalize_phone_e164
from graphql.data_sources.database import SessionLocal
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.data_sources.models.crm_enrollment_token import CrmEnrollmentToken


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse({"message": message}, status_code=status)


async def enroll_endpoint(request: Request) -> Response:
    """Validate enrollment token and register customer device."""
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return _error(400, "Invalid JSON body")
    if not isinstance(body, dict):
        return _error(400, "Invalid JSON body")

    raw_token = body.get("token")
    app_id_raw = body.get("appId")
    phone_raw = body.get("phoneE164")
    public_key = body.get("publicKey")
    platform = body.get("platform")

    if not isinstance(raw_token, str) or not raw_token.strip():
        return _error(400, "token is required")
    if not isinstance(app_id_raw, str) or not app_id_raw.strip():
        return _error(400, "appId is required")
    if not isinstance(phone_raw, str) or not phone_raw.strip():
        return _error(400, "phoneE164 is required")
    if not isinstance(public_key, str) or not public_key.strip():
        return _error(400, "publicKey is required")
    if not isinstance(platform, str) or not platform.strip():
        return _error(400, "platform is required")
    if len(platform.strip()) > 64:
        return _error(400, "platform must be at most 64 characters")
    if len(public_key.strip()) > 4096:
        return _error(400, "publicKey is too long")

    try:
        app_uuid = uuid.UUID(app_id_raw.strip())
    except ValueError:
        return _error(400, "appId must be a valid UUID")

    try:
        phone = normalize_phone_e164(phone_raw)
    except ValueError as exc:
        return _error(400, str(exc))

    token_hash = hash_enrollment_token(raw_token.strip())
    now = datetime.now(tz=UTC)

    session = SessionLocal()
    try:
        app = session.query(CrmApp).filter(CrmApp.app_id == app_uuid).first()
        if app is None:
            return _error(404, "CRM app not found")

        token_row = (
            session.query(CrmEnrollmentToken)
            .filter(
                CrmEnrollmentToken.token_hash == token_hash,
                CrmEnrollmentToken.crm_app_id == app.id,
            )
            .first()
        )
        if token_row is None:
            return _error(401, "Invalid enrollment token")
        expires_at = token_row.expires_at
        if getattr(expires_at, "tzinfo", None) is None:
            expires_at = expires_at.replace(tzinfo=UTC)  # type: ignore[union-attr]
        if token_row.used_at is not None:
            return _error(401, "Enrollment token already used")
        if expires_at <= now:  # type: ignore[operator]
            return _error(401, "Enrollment token expired")

        customer = (
            session.query(CrmCustomer)
            .filter(
                CrmCustomer.crm_app_id == app.id,
                CrmCustomer.phone_e164 == phone,
            )
            .first()
        )
        if customer is None:
            customer = CrmCustomer(crm_app_id=app.id, phone_e164=phone)
            session.add(customer)
            session.flush()

        device = CrmDevice(
            customer_id=customer.id,
            public_key=public_key.strip(),
            platform=platform.strip().lower(),
        )
        session.add(device)
        token_row.used_at = now
        session.commit()
        session.refresh(customer)
        session.refresh(device)

        return JSONResponse(
            {
                "customerId": str(customer.id),
                "deviceId": str(device.id),
            },
            status_code=201,
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
