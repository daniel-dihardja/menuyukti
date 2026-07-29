"""HTTP tests for POST /crm/v1/enroll."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from graphql.crm_auth.tokens import hash_enrollment_token, hash_opaque_token
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
from graphql.server import app
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from starlette.testclient import TestClient

_CREATE_APP = """
mutation CreateCrmApp($title: String!) {
  createCrmApp(title: $title) {
    id
    appId
  }
}
"""

_CREATE_TOKEN = """
mutation CreateCrmEnrollmentToken($appId: Int!) {
  createCrmEnrollmentToken(appId: $appId) {
    token
    enrollUrl
  }
}
"""

_CUSTOMERS = """
query CrmCustomers($appId: Int!) {
  crmCustomers(appId: $appId) {
    id
    phoneMasked
    deviceCount
  }
}
"""


def _public_key_hex() -> str:
    return Ed25519PrivateKey.generate().public_key().public_bytes_raw().hex()


@pytest.fixture
def enroll_workspace():
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
        ws = Workspace(name="CRM enroll HTTP workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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


def _gql(query: str, variables: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variables or {},
            context_value=graphql_auth_context(),
        )
    )


def test_enroll_creates_customer_and_device(enroll_workspace: int):
    created = _gql(_CREATE_APP, {"title": "HTTP Enroll App"})
    assert created.errors is None
    app_row = created.data["createCrmApp"]

    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    assert token_result.errors is None
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]

    public_key = _public_key_hex()
    client = TestClient(app)
    response = client.post(
        "/crm/v1/enroll",
        json={
            "token": raw_token,
            "appId": app_row["appId"],
            "phoneE164": "+491701112233",
            "publicKey": public_key,
            "platform": "ios",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["customerId"]
    assert body["deviceId"]
    assert body["refreshToken"]
    refresh_token = body["refreshToken"]

    listed = _gql(_CUSTOMERS, {"appId": app_row["id"]})
    assert listed.errors is None
    customers = listed.data["crmCustomers"]
    assert len(customers) == 1
    assert customers[0]["phoneMasked"] == "+49***33"
    assert customers[0]["deviceCount"] == 1
    assert customers[0]["id"] == body["customerId"]

    session = SessionLocal()
    try:
        token_row = (
            session.query(CrmEnrollmentToken)
            .filter(CrmEnrollmentToken.token_hash == hash_enrollment_token(raw_token))
            .one()
        )
        assert token_row.used_at is not None
        device = session.query(CrmDevice).filter(CrmDevice.id == UUID(body["deviceId"])).one()
        assert device.public_key == public_key
        assert device.refresh_token_hash == hash_opaque_token(refresh_token)
        assert device.refresh_token_hash != refresh_token
        assert device.refresh_expires_at is not None
        audit = (
            session.query(CrmAuditEvent)
            .filter(CrmAuditEvent.event_type == "enroll", CrmAuditEvent.device_id == device.id)
            .one()
        )
        assert audit.customer_id is not None
    finally:
        session.close()


def test_enroll_rejects_invalid_public_key(enroll_workspace: int):
    created = _gql(_CREATE_APP, {"title": "Bad Key App"})
    app_row = created.data["createCrmApp"]
    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]

    client = TestClient(app)
    response = client.post(
        "/crm/v1/enroll",
        json={
            "token": raw_token,
            "appId": app_row["appId"],
            "publicKey": "not-a-hex-key",
            "platform": "ios",
        },
    )
    assert response.status_code == 400
    assert "publicKey" in response.json()["message"]


def test_enroll_rejects_reused_token(enroll_workspace: int):
    created = _gql(_CREATE_APP, {"title": "Reuse Token App"})
    assert created.errors is None
    app_row = created.data["createCrmApp"]
    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]

    payload = {
        "token": raw_token,
        "appId": app_row["appId"],
        "phoneE164": "+491709998877",
        "publicKey": _public_key_hex(),
        "platform": "android",
    }
    client = TestClient(app)
    first = client.post("/crm/v1/enroll", json=payload)
    assert first.status_code == 201

    second = client.post(
        "/crm/v1/enroll",
        json={**payload, "phoneE164": "+491709998866", "publicKey": _public_key_hex()},
    )
    assert second.status_code == 401
    assert "already used" in second.json()["message"]


def test_enroll_rejects_invalid_phone(enroll_workspace: int):
    created = _gql(_CREATE_APP, {"title": "Bad Phone App"})
    app_row = created.data["createCrmApp"]
    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]

    client = TestClient(app)
    response = client.post(
        "/crm/v1/enroll",
        json={
            "token": raw_token,
            "appId": app_row["appId"],
            "phoneE164": "not-a-phone",
            "publicKey": _public_key_hex(),
            "platform": "ios",
        },
    )
    assert response.status_code == 400


def test_enroll_without_phone(enroll_workspace: int):
    created = _gql(_CREATE_APP, {"title": "No Phone App"})
    assert created.errors is None
    app_row = created.data["createCrmApp"]
    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    assert token_result.errors is None
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]

    client = TestClient(app)
    response = client.post(
        "/crm/v1/enroll",
        json={
            "token": raw_token,
            "appId": app_row["appId"],
            "publicKey": _public_key_hex(),
            "platform": "ios",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["customerId"]
    assert body["deviceId"]
    assert body["refreshToken"]

    listed = _gql(_CUSTOMERS, {"appId": app_row["id"]})
    assert listed.errors is None
    customers = listed.data["crmCustomers"]
    assert len(customers) == 1
    assert customers[0]["phoneMasked"] == "—"
    assert customers[0]["deviceCount"] == 1


def test_enroll_cors_preflight(enroll_workspace: int):
    client = TestClient(app)
    response = client.options(
        "/crm/v1/enroll",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:8081"
    assert "POST" in (response.headers.get("access-control-allow-methods") or "")


def test_enroll_skips_internal_api_key(enroll_workspace: int, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "secret-key")
    import graphql.server as server_mod

    monkeypatch.setattr(server_mod, "INTERNAL_API_KEY", "secret-key")

    created = _gql(_CREATE_APP, {"title": "Key Skip App"})
    app_row = created.data["createCrmApp"]
    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]

    client = TestClient(app)
    response = client.post(
        "/crm/v1/enroll",
        json={
            "token": raw_token,
            "appId": app_row["appId"],
            "phoneE164": "+12025550123",
            "publicKey": _public_key_hex(),
            "platform": "ios",
        },
    )
    assert response.status_code == 201
