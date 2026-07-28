"""Helpers for mapping CRM customer / device ORM rows to GraphQL types."""

from __future__ import annotations

from datetime import datetime

from graphql.crm_auth.tokens import mask_phone_e164
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.schema.types.crm_customer import CrmCustomerStatus, CrmCustomerType
from graphql.schema.types.crm_device import CrmDeviceType


def device_to_gql(row: CrmDevice) -> CrmDeviceType:
    return CrmDeviceType(
        id=row.id,
        platform=row.platform,
        label=row.label,
        created_at=row.created_at,  # type: ignore[arg-type]
        last_seen_at=row.last_seen_at,  # type: ignore[arg-type]
        revoked_at=row.revoked_at,  # type: ignore[arg-type]
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


def customer_to_gql(
    row: CrmCustomer,
    *,
    devices: list[CrmDevice] | None = None,
    include_devices: bool = False,
) -> CrmCustomerType:
    device_list = devices if devices is not None else list(row.devices or [])
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
    )
