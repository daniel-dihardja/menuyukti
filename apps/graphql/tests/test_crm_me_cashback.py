"""HTTP tests for GET /crm/v1/me/cashback."""

from __future__ import annotations

import asyncio
import os
import uuid
from datetime import UTC, datetime

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from graphql.data_sources import (
    CrmApp,
    CrmAuditEvent,
    CrmAuthChallenge,
    CrmCashbackEntry,
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

os.environ.setdefault("CRM_JWT_SECRET", "test-crm-jwt-secret-at-least-32-chars!!")

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
  }
}
"""

_UPDATE_APP = """
mutation UpdateCrmApp(
  $id: Int!
  $title: String!
  $cashbackThresholdAmount: Int
  $cashbackPercent: Int
) {
  updateCrmApp(
    id: $id
    title: $title
    cashbackThresholdAmount: $cashbackThresholdAmount
    cashbackPercent: $cashbackPercent
  ) {
    id
    cashbackThresholdAmount
    cashbackPercent
  }
}
"""


def _gql(query: str, variables: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variables or {},
            context_value=graphql_auth_context(),
        )
    )


def _keypair() -> tuple[str, Ed25519PrivateKey]:
    private_key = Ed25519PrivateKey.generate()
    public_hex = private_key.public_key().public_bytes_raw().hex()
    return public_hex, private_key


def _sign(private_key: Ed25519PrivateKey, nonce: str) -> str:
    return private_key.sign(nonce.encode("utf-8")).hex()


@pytest.fixture
def cashback_workspace(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("CRM_JWT_SECRET", "test-crm-jwt-secret-at-least-32-chars!!")
    session = SessionLocal()
    try:
        session.query(CrmCashbackEntry).delete()
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
        ws = Workspace(name="CRM cashback workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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
        session.query(CrmCashbackEntry).delete()
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


def _enroll(client: TestClient, *, title: str = "Cashback App") -> dict:
    created = _gql(_CREATE_APP, {"title": title})
    assert created.errors is None
    app_row = created.data["createCrmApp"]
    token_result = _gql(_CREATE_TOKEN, {"appId": app_row["id"]})
    assert token_result.errors is None
    raw_token = token_result.data["createCrmEnrollmentToken"]["token"]
    public_hex, private_key = _keypair()
    response = client.post(
        "/crm/v1/enroll",
        json={
            "token": raw_token,
            "appId": app_row["appId"],
            "phoneE164": "+491701112233",
            "publicKey": public_hex,
            "platform": "ios",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    return {
        "app": app_row,
        "private_key": private_key,
        "customerId": body["customerId"],
        "deviceId": body["deviceId"],
        "refreshToken": body["refreshToken"],
    }


def _access_token(client: TestClient, enrolled: dict) -> str:
    challenge = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    assert challenge.status_code == 200
    ch = challenge.json()
    signature = _sign(enrolled["private_key"], ch["nonce"])
    verify = client.post(
        "/crm/v1/auth/verify",
        json={
            "deviceId": enrolled["deviceId"],
            "challengeId": ch["challengeId"],
            "signature": signature,
        },
    )
    assert verify.status_code == 200
    return verify.json()["accessToken"]


def test_me_cashback_requires_bearer(cashback_workspace: int):
    client = TestClient(app)
    response = client.get("/crm/v1/me/cashback")
    assert response.status_code == 401
    assert "Bearer" in response.json()["message"]


def test_me_cashback_empty_ledger_and_default_config(cashback_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client)
    access = _access_token(client, enrolled)

    response = client.get(
        "/crm/v1/me/cashback",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["balance"] == 0
    assert body["entries"] == []
    assert body["config"] == {"thresholdAmount": 0, "percent": 0}


def test_me_cashback_returns_config_and_balance(cashback_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Configured App")
    updated = _gql(
        _UPDATE_APP,
        {
            "id": enrolled["app"]["id"],
            "title": "Configured App",
            "cashbackThresholdAmount": 100_000,
            "cashbackPercent": 20,
        },
    )
    assert updated.errors is None

    session = SessionLocal()
    try:
        session.add(
            CrmCashbackEntry(
                customer_id=uuid.UUID(enrolled["customerId"]),
                amount=15_000,
                label="Welcome bonus",
            )
        )
        session.add(
            CrmCashbackEntry(
                customer_id=uuid.UUID(enrolled["customerId"]),
                amount=5_000,
                label="Visit",
            )
        )
        session.commit()
    finally:
        session.close()

    access = _access_token(client, enrolled)
    response = client.get(
        "/crm/v1/me/cashback",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["balance"] == 20_000
    assert body["config"] == {"thresholdAmount": 100_000, "percent": 20}
    assert len(body["entries"]) == 2
    amounts = {row["amount"] for row in body["entries"]}
    assert amounts == {15_000, 5_000}
    assert all("id" in row and "createdAt" in row for row in body["entries"])


def test_me_cashback_rejects_revoked_device(cashback_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Revoked Cashback")
    access = _access_token(client, enrolled)

    revoke = client.post(
        "/crm/v1/auth/revoke",
        headers={"Authorization": f"Bearer {access}"},
        json={},
    )
    assert revoke.status_code == 200

    response = client.get(
        "/crm/v1/me/cashback",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert response.status_code == 401
    assert "revoked" in response.json()["message"].lower()
