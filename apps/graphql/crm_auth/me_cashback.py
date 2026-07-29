"""GET /crm/v1/me/cashback — customer cashback balance, history, and app rule."""

from __future__ import annotations

from sqlalchemy import func
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from graphql.crm_auth.http_util import (
    AccessClaims,
    ensure_aware,
    error_response,
    require_access_claims,
)
from graphql.data_sources.database import SessionLocal
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_cashback_entry import CrmCashbackEntry
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice

_ENTRY_LIMIT = 50


def _iso(dt: object) -> str:
    aware = ensure_aware(dt)
    return aware.isoformat()


async def me_cashback_endpoint(request: Request) -> Response:
    claims_or_error = require_access_claims(request)
    if isinstance(claims_or_error, JSONResponse):
        return claims_or_error
    claims: AccessClaims = claims_or_error

    session = SessionLocal()
    try:
        device = session.query(CrmDevice).filter(CrmDevice.id == claims.did).first()
        if device is None:
            return error_response(404, "Device not found")
        if device.revoked_at is not None:
            return error_response(401, "Device revoked")

        customer = session.query(CrmCustomer).filter(CrmCustomer.id == claims.sub).first()
        if customer is None:
            return error_response(404, "Customer not found")
        if device.customer_id != customer.id:
            return error_response(401, "Invalid access token")

        app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
        if app is None:
            return error_response(404, "CRM app not found")
        if app.app_id != claims.app_id:
            return error_response(401, "Invalid access token")

        balance = (
            session.query(func.coalesce(func.sum(CrmCashbackEntry.amount), 0))
            .filter(CrmCashbackEntry.customer_id == customer.id)
            .scalar()
        )
        balance_int = int(balance or 0)

        entries = (
            session.query(CrmCashbackEntry)
            .filter(CrmCashbackEntry.customer_id == customer.id)
            .order_by(CrmCashbackEntry.created_at.desc())
            .limit(_ENTRY_LIMIT)
            .all()
        )

        return JSONResponse(
            {
                "balance": balance_int,
                "entries": [
                    {
                        "id": str(entry.id),
                        "amount": entry.amount,
                        "paymentAmount": entry.payment_amount,
                        "cashbackPercent": entry.cashback_percent,
                        "label": entry.label,
                        "createdAt": _iso(entry.created_at),
                    }
                    for entry in entries
                ],
                "config": {
                    "thresholdAmount": app.cashback_threshold_amount,
                    "percent": app.cashback_percent,
                },
            },
            status_code=200,
        )
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
