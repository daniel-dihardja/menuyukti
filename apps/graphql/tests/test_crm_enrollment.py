"""Tests for CRM customer list and enrollment token minting."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest
from graphql.crm_auth.tokens import hash_enrollment_token
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
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_CREATE_APP = """
mutation CreateCrmApp($title: String!) {
  createCrmApp(title: $title) {
    id
    appId
  }
}
"""

_CUSTOMERS = """
query CrmCustomers($appId: Int!) {
  crmCustomers(appId: $appId) {
    id
    phoneMasked
    createdAt
    deviceCount
    lastSeenAt
    status
  }
}
"""

_CREATE_TOKEN = """
mutation CreateCrmEnrollmentToken($appId: Int!) {
  createCrmEnrollmentToken(appId: $appId) {
    token
    expiresAt
    enrollUrl
  }
}
"""

_DELETE_CUSTOMER = """
mutation DeleteCrmCustomer($id: UUID!) {
  deleteCrmCustomer(id: $id)
}
"""

OTHER_USER_ID = "clerk_other_crm_enroll_user"


@pytest.fixture
def crm_enroll_workspace_id():
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
        ws = Workspace(name="CRM enroll workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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


def _create_app() -> dict:
    created = _execute(_CREATE_APP, {"title": "Loyalty Demo"})
    assert created.errors is None
    return created.data["createCrmApp"]


def test_customers_empty_for_member(crm_enroll_workspace_id: int):
    app = _create_app()
    result = _execute(_CUSTOMERS, {"appId": app["id"]})
    assert result.errors is None
    assert result.data["crmCustomers"] == []


def test_customers_denied_without_auth(crm_enroll_workspace_id: int):
    app = _create_app()
    result = _execute(_CUSTOMERS, {"appId": app["id"]}, context_value={})
    assert result.errors is None
    assert result.data["crmCustomers"] == []


def test_non_member_cannot_list_customers(crm_enroll_workspace_id: int):
    app = _create_app()
    result = _execute(
        _CUSTOMERS,
        {"appId": app["id"]},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert result.errors is None
    assert result.data["crmCustomers"] == []


def test_create_enrollment_token(crm_enroll_workspace_id: int):
    app = _create_app()
    result = _execute(_CREATE_TOKEN, {"appId": app["id"]})
    assert result.errors is None
    payload = result.data["createCrmEnrollmentToken"]
    assert payload["token"]
    assert payload["enrollUrl"].startswith("menuyukti://enroll?token=")
    assert f"app={app['appId']}" in payload["enrollUrl"]
    assert UUID(app["appId"])

    session = SessionLocal()
    try:
        rows = (
            session.query(CrmEnrollmentToken)
            .filter(CrmEnrollmentToken.crm_app_id == app["id"])
            .all()
        )
        assert len(rows) == 1
        assert rows[0].token_hash == hash_enrollment_token(payload["token"])
        assert rows[0].used_at is None
        expires_at = rows[0].expires_at
        if getattr(expires_at, "tzinfo", None) is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        assert expires_at > datetime.now(tz=UTC)
        assert expires_at <= datetime.now(tz=UTC) + timedelta(minutes=6)
    finally:
        session.close()


def test_non_member_cannot_create_token(crm_enroll_workspace_id: int):
    app = _create_app()
    denied = _execute(
        _CREATE_TOKEN,
        {"appId": app["id"]},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is not None
    assert "Not allowed" in str(denied.errors[0])


def test_customers_after_manual_insert(crm_enroll_workspace_id: int):
    app = _create_app()
    session = SessionLocal()
    try:
        customer = CrmCustomer(crm_app_id=app["id"], phone_e164="+491701234567")
        session.add(customer)
        session.flush()
        session.add(
            CrmDevice(
                customer_id=customer.id,
                public_key="test-public-key",
                platform="ios",
            )
        )
        session.commit()
        customer_id = str(customer.id)
    finally:
        session.close()

    result = _execute(_CUSTOMERS, {"appId": app["id"]})
    assert result.errors is None
    rows = result.data["crmCustomers"]
    assert len(rows) == 1
    assert rows[0]["id"] == customer_id
    assert rows[0]["phoneMasked"] == "+49***67"
    assert rows[0]["deviceCount"] == 1
    assert rows[0]["status"] == "ACTIVE"


def test_delete_customer_cascades_devices(crm_enroll_workspace_id: int):
    app = _create_app()
    session = SessionLocal()
    try:
        customer = CrmCustomer(crm_app_id=app["id"], phone_e164="+491709999999")
        session.add(customer)
        session.flush()
        session.add(
            CrmDevice(
                customer_id=customer.id,
                public_key="delete-me-key",
                platform="android",
            )
        )
        session.commit()
        customer_id = str(customer.id)
    finally:
        session.close()

    deleted = _execute(_DELETE_CUSTOMER, {"id": customer_id})
    assert deleted.errors is None
    assert deleted.data["deleteCrmCustomer"] is True

    listed = _execute(_CUSTOMERS, {"appId": app["id"]})
    assert listed.errors is None
    assert listed.data["crmCustomers"] == []

    session = SessionLocal()
    try:
        assert (
            session.query(CrmCustomer).filter(CrmCustomer.id == UUID(customer_id)).first() is None
        )
        assert (
            session.query(CrmDevice).filter(CrmDevice.public_key == "delete-me-key").first() is None
        )
    finally:
        session.close()


def test_non_member_cannot_delete_customer(crm_enroll_workspace_id: int):
    app = _create_app()
    session = SessionLocal()
    try:
        customer = CrmCustomer(crm_app_id=app["id"], phone_e164="+491708888888")
        session.add(customer)
        session.commit()
        customer_id = str(customer.id)
    finally:
        session.close()

    denied = _execute(
        _DELETE_CUSTOMER,
        {"id": customer_id},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is not None
    assert "Not allowed" in str(denied.errors[0])

    session = SessionLocal()
    try:
        assert (
            session.query(CrmCustomer).filter(CrmCustomer.id == UUID(customer_id)).first()
            is not None
        )
    finally:
        session.close()


def test_delete_customer_not_found(crm_enroll_workspace_id: int):
    missing_id = "00000000-0000-4000-8000-000000000001"
    result = _execute(_DELETE_CUSTOMER, {"id": missing_id})
    assert result.errors is not None
    assert "not found" in str(result.errors[0]).lower()
