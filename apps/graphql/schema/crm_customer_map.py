"""Helpers for mapping CRM customer / device / cashback ORM rows to GraphQL types."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from graphql.crm_auth.tokens import mask_phone_e164
from graphql.data_sources.models.crm_cashback_entry import CrmCashbackEntry
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.schema.types.crm_cashback_entry import CrmCashbackEntryType
from graphql.schema.types.crm_customer import CrmCustomerStatus, CrmCustomerType
from graphql.schema.types.crm_device import CrmDeviceType

_CASHBACK_ENTRY_LIMIT = 50


def device_to_gql(row: CrmDevice) -> CrmDeviceType:
    return CrmDeviceType(
        id=row.id,
        platform=row.platform,
        label=row.label,
        created_at=row.created_at,  # type: ignore[arg-type]
        last_seen_at=row.last_seen_at,  # type: ignore[arg-type]
        revoked_at=row.revoked_at,  # type: ignore[arg-type]
    )


def cashback_entry_to_gql(row: CrmCashbackEntry) -> CrmCashbackEntryType:
    return CrmCashbackEntryType(
        id=row.id,
        customer_id=row.customer_id,
        amount=row.amount,
        payment_amount=row.payment_amount,
        cashback_percent=row.cashback_percent,
        label=row.label,
        created_at=row.created_at,  # type: ignore[arg-type]
    )


def customer_status_from_devices(devices: list[CrmDevice]) -> CrmCustomerStatus:
    if not devices:
        return CrmCustomerStatus.NONE
    if any(d.revoked_at is None for d in devices):
        return CrmCustomerStatus.ACTIVE
    return CrmCustomerStatus.REVOKED


def max_last_seen(devices: list[CrmDevice]) -> datetime | None:
    seen = [d.last_seen_at for d in devices if d.last_seen_at is not None]
    if not seen:
        return None
    return max(seen)  # type: ignore[type-var]


def load_customer_cashback(
    session: Session,
    customer_id: object,
) -> tuple[int, list[CrmCashbackEntryType]]:
    balance = (
        session.query(func.coalesce(func.sum(CrmCashbackEntry.amount), 0))
        .filter(CrmCashbackEntry.customer_id == customer_id)
        .scalar()
    )
    entries = (
        session.query(CrmCashbackEntry)
        .filter(CrmCashbackEntry.customer_id == customer_id)
        .order_by(CrmCashbackEntry.created_at.desc())
        .limit(_CASHBACK_ENTRY_LIMIT)
        .all()
    )
    return int(balance or 0), [cashback_entry_to_gql(e) for e in entries]


def customer_to_gql(
    row: CrmCustomer,
    *,
    devices: list[CrmDevice] | None = None,
    include_devices: bool = False,
    cashback_balance: int = 0,
    cashback_entries: list[CrmCashbackEntryType] | None = None,
    include_cashback: bool = False,
) -> CrmCustomerType:
    device_list = devices if devices is not None else list(row.devices or [])
    entries = cashback_entries if include_cashback and cashback_entries is not None else []
    balance = cashback_balance if include_cashback else 0
    return CrmCustomerType(
        id=row.id,
        app_id=row.crm_app_id,
        phone_masked=mask_phone_e164(row.phone_e164),
        given_name=row.given_name,
        family_name=row.family_name,
        created_at=row.created_at,  # type: ignore[arg-type]
        device_count=len(device_list),
        last_seen_at=max_last_seen(device_list),
        status=customer_status_from_devices(device_list),
        devices=[device_to_gql(d) for d in device_list] if include_devices else [],
        cashback_balance=balance,
        cashback_entries=entries,
    )
