"""Tests for CRM customer detail, staff device revoke, and enrollment rate limit."""

from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from graphql.crm_auth.tokens import hash_opaque_token
from graphql.data_sources import (
    CrmApp,
    CrmAuditEvent,
    CrmAuthChallenge,
    CrmCustomer,
    CrmDevice,
    CrmEnrollmentToken,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.server import app as fastapi_app
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from starlette.testclient import TestClient

os.environ.setdefault("CRM_JWT_SECRET", "test-crm-jwt-secret-at-least-32-chars!!")

_CREATE_APP = """
mutation CreateCrmApp($title: String!) {
  createCrmApp(title: $title) {
    id
    appId
  }
}
"""

_CUSTOMERS = """
query CrmCustomers($appId: Int!, $search: String) {
  crmCustomers(appId: $appId, search: $search) {
    id
    phoneMasked
    givenName
    familyName
    createdAt
    deviceCount
    lastSeenAt
    status
  }
}
"""

_CUSTOMER = """
query CrmCustomer($id: UUID!) {
  crmCustomer(id: $id) {
    id
    phoneMasked
    status
    deviceCount
    lastSeenAt
    cashbackBalance
    cashbackEntries {
      id
      customerId
      amount
      paymentAmount
      cashbackPercent
      label
      createdAt
    }
    devices {
      id
      platform
      label
      createdAt
      lastSeenAt
      revokedAt
    }
  }
}
"""

_REVOKE = """
mutation RevokeCrmDevice($deviceId: UUID!) {
  revokeCrmDevice(deviceId: $deviceId) {
    id
    revokedAt
  }
}
"""

_CREATE_TOKEN = """
mutation CreateCrmEnrollmentToken($appId: Int!) {
  createCrmEnrollmentToken(appId: $appId) {
    token
  }
}
"""

OTHER_USER_ID = "clerk_other_crm_staff_detail_user"


@pytest.fixture
def crm_staff_workspace_id(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CRM_JWT_SECRET", "test-crm-jwt-secret-at-least-32-chars!!")
    session = SessionLocal()
    try:
        session.query(CrmAuditEvent).delete()
        session.query(CrmAuthChallenge).delete()
        session.query(CrmDevice).delete()
        session.query(CrmCustomer).delete()
        session.query(CrmEnrollmentToken).delete()
        session.query(CrmApp).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="CRM staff detail workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        session.commit()
        session.refresh(ws)
        wid = ws.id
    finally:
        session.close()
    yield wid
    session = SessionLocal()
    try:
        session.query(CrmAuditEvent).delete()
        session.query(CrmAuthChallenge).delete()
        session.query(CrmDevice).delete()
        session.query(CrmCustomer).delete()
        session.query(CrmEnrollmentToken).delete()
        session.query(CrmApp).filter(CrmApp.workspace_id == wid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def _create_app(title: str = "Staff Detail App") -> dict:
    created = _execute(_CREATE_APP, {"title": title})
    assert created.errors is None
    return created.data["createCrmApp"]


def _seed_customer_with_device(
    app_id: int,
    *,
    phone: str = "+491701234567",
    given_name: str | None = "Ada",
    family_name: str | None = "Lovelace",
    with_refresh: bool = True,
) -> tuple[str, str, str]:
    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        customer = CrmCustomer(
            crm_app_id=app_id,
            phone_e164=phone,
            given_name=given_name,
            family_name=family_name,
        )
        session.add(customer)
        session.flush()
        refresh_raw = f"staff-revoke-refresh-{phone[-4:]}-token-pad"
        device = CrmDevice(
            customer_id=customer.id,
            public_key=(phone.encode().hex() + "0" * 64)[:64],
            platform="ios",
            label="iPhone",
            last_seen_at=now - timedelta(hours=1),
            refresh_token_hash=hash_opaque_token(refresh_raw) if with_refresh else None,
            refresh_expires_at=now + timedelta(days=30) if with_refresh else None,
        )
        session.add(device)
        session.commit()
        return str(customer.id), str(device.id), refresh_raw
    finally:
        session.close()


def test_list_includes_status_last_seen_and_masked_phone(crm_staff_workspace_id: int):
    app = _create_app()
    _seed_customer_with_device(app["id"])

    result = _execute(_CUSTOMERS, {"appId": app["id"]})
    assert result.errors is None
    rows = result.data["crmCustomers"]
    assert len(rows) == 1
    assert rows[0]["phoneMasked"] == "+49***67"
    assert rows[0]["givenName"] == "Ada"
    assert rows[0]["familyName"] == "Lovelace"
    assert rows[0]["deviceCount"] == 1
    assert rows[0]["status"] == "ACTIVE"
    assert rows[0]["lastSeenAt"] is not None


def test_list_search_filters_by_name(crm_staff_workspace_id: int):
    app = _create_app()
    _seed_customer_with_device(app["id"], phone="+491701111111", given_name="Ada")
    _seed_customer_with_device(
        app["id"],
        phone="+491702222222",
        given_name="Grace",
        family_name="Hopper",
    )
    result = _execute(_CUSTOMERS, {"appId": app["id"], "search": "grace"})
    assert result.errors is None
    rows = result.data["crmCustomers"]
    assert len(rows) == 1
    assert rows[0]["givenName"] == "Grace"


def test_crm_customer_detail_returns_devices(crm_staff_workspace_id: int):
    app = _create_app()
    customer_id, device_id, _ = _seed_customer_with_device(app["id"])

    result = _execute(_CUSTOMER, {"id": customer_id})
    assert result.errors is None
    detail = result.data["crmCustomer"]
    assert detail is not None
    assert detail["id"] == customer_id
    assert detail["status"] == "ACTIVE"
    assert detail["cashbackBalance"] == 0
    assert detail["cashbackEntries"] == []
    assert len(detail["devices"]) == 1
    assert detail["devices"][0]["id"] == device_id
    assert detail["devices"][0]["platform"] == "ios"
    assert detail["devices"][0]["label"] == "iPhone"
    assert detail["devices"][0]["revokedAt"] is None


def test_crm_customer_detail_returns_cashback_history(crm_staff_workspace_id: int):
    from graphql.data_sources import CrmCashbackEntry

    app = _create_app()
    customer_id, _, _ = _seed_customer_with_device(app["id"])
    now = datetime.now(tz=UTC)

    session = SessionLocal()
    try:
        session.add(
            CrmCashbackEntry(
                customer_id=UUID(customer_id),
                amount=10_000,
                payment_amount=100_000,
                cashback_percent=10,
                label="Visit",
                created_at=now - timedelta(hours=1),
            )
        )
        session.add(
            CrmCashbackEntry(
                customer_id=UUID(customer_id),
                amount=-4_000,
                payment_amount=None,
                cashback_percent=None,
                label="Redeemed at till",
                created_at=now,
            )
        )
        session.commit()
    finally:
        session.close()

    result = _execute(_CUSTOMER, {"id": customer_id})
    assert result.errors is None
    detail = result.data["crmCustomer"]
    assert detail["cashbackBalance"] == 6_000
    assert len(detail["cashbackEntries"]) == 2
    # Newest first
    assert detail["cashbackEntries"][0]["amount"] == -4_000
    assert detail["cashbackEntries"][0]["label"] == "Redeemed at till"
    assert detail["cashbackEntries"][0]["paymentAmount"] is None
    assert detail["cashbackEntries"][1]["amount"] == 10_000
    assert detail["cashbackEntries"][1]["paymentAmount"] == 100_000
    assert detail["cashbackEntries"][1]["cashbackPercent"] == 10


def test_crm_customer_null_for_non_member(crm_staff_workspace_id: int):
    app = _create_app()
    customer_id, _, _ = _seed_customer_with_device(app["id"])

    result = _execute(
        _CUSTOMER,
        {"id": customer_id},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert result.errors is None
    assert result.data["crmCustomer"] is None


def test_revoke_crm_device_clears_refresh_and_audits(crm_staff_workspace_id: int):
    app = _create_app()
    customer_id, device_id, refresh_raw = _seed_customer_with_device(app["id"])

    first = _execute(_REVOKE, {"deviceId": device_id})
    assert first.errors is None
    assert first.data["revokeCrmDevice"]["revokedAt"] is not None

    session = SessionLocal()
    try:
        device = session.query(CrmDevice).filter(CrmDevice.id == UUID(device_id)).one()
        assert device.revoked_at is not None
        assert device.refresh_token_hash is None
        assert device.refresh_expires_at is None
        audits = (
            session.query(CrmAuditEvent)
            .filter(
                CrmAuditEvent.event_type == "revoke_staff",
                CrmAuditEvent.device_id == UUID(device_id),
            )
            .all()
        )
        assert len(audits) == 1
        assert GRAPHQL_TEST_USER_ID in (audits[0].detail or "")
    finally:
        session.close()

    second = _execute(_REVOKE, {"deviceId": device_id})
    assert second.errors is None
    assert second.data["revokeCrmDevice"]["revokedAt"] is not None

    listed = _execute(_CUSTOMERS, {"appId": app["id"]})
    assert listed.errors is None
    assert listed.data["crmCustomers"][0]["status"] == "REVOKED"

    client = TestClient(fastapi_app)
    refresh = client.post("/crm/v1/auth/refresh", json={"refreshToken": refresh_raw})
    assert refresh.status_code == 401


def test_enrollment_token_rate_limit_and_audit(crm_staff_workspace_id: int):
    app = _create_app("Rate Limit App")

    for i in range(10):
        ok = _execute(_CREATE_TOKEN, {"appId": app["id"]})
        assert ok.errors is None, f"token {i + 1} failed: {ok.errors}"

    blocked = _execute(_CREATE_TOKEN, {"appId": app["id"]})
    assert blocked.errors is not None
    assert "Too many enrollment tokens" in str(blocked.errors[0])

    session = SessionLocal()
    try:
        creates = (
            session.query(CrmAuditEvent)
            .filter(
                CrmAuditEvent.event_type == "enrollment_token_create",
                CrmAuditEvent.crm_app_id == app["id"],
            )
            .all()
        )
        assert len(creates) == 10
    finally:
        session.close()
