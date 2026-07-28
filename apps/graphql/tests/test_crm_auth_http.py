"""HTTP tests for CRM passwordless auth (challenge / verify / refresh / revoke)."""

from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
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
from graphql.server import app
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from starlette.testclient import TestClient

# Tests set a deterministic JWT secret before importing-dependent code runs.
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
def auth_workspace(monkeypatch: pytest.MonkeyPatch):
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
        ws = Workspace(name="CRM auth HTTP workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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


def _enroll(client: TestClient, *, title: str = "Auth App") -> dict:
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
        "public_hex": public_hex,
        "customerId": body["customerId"],
        "deviceId": body["deviceId"],
        "refreshToken": body["refreshToken"],
    }


def test_challenge_verify_issues_access_jwt(auth_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client)

    challenge = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    assert challenge.status_code == 200
    ch = challenge.json()
    assert ch["challengeId"]
    assert ch["nonce"]

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
    access = verify.json()["accessToken"]
    claims = jwt.decode(
        access,
        os.environ["CRM_JWT_SECRET"],
        algorithms=["HS256"],
    )
    assert claims["sub"] == enrolled["customerId"]
    assert claims["did"] == enrolled["deviceId"]
    assert claims["app_id"] == enrolled["app"]["appId"]

    session = SessionLocal()
    try:
        events = (
            session.query(CrmAuditEvent)
            .filter(CrmAuditEvent.event_type.in_(["enroll", "challenge", "verify_ok"]))
            .all()
        )
        assert {e.event_type for e in events} >= {"enroll", "challenge", "verify_ok"}
        device = session.query(CrmDevice).filter(CrmDevice.id == enrolled["deviceId"]).one()
        assert device.last_seen_at is not None
    finally:
        session.close()


def test_refresh_rotates_token(auth_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Refresh App")
    old_refresh = enrolled["refreshToken"]

    first = client.post("/crm/v1/auth/refresh", json={"refreshToken": old_refresh})
    assert first.status_code == 200
    body = first.json()
    assert body["accessToken"]
    assert body["refreshToken"]
    assert body["refreshToken"] != old_refresh

    reused = client.post("/crm/v1/auth/refresh", json={"refreshToken": old_refresh})
    assert reused.status_code == 401

    second = client.post("/crm/v1/auth/refresh", json={"refreshToken": body["refreshToken"]})
    assert second.status_code == 200


def test_revoked_device_cannot_auth(auth_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Revoke App")

    revoke = client.post(
        "/crm/v1/auth/revoke",
        json={"refreshToken": enrolled["refreshToken"]},
    )
    assert revoke.status_code == 200
    assert revoke.json()["ok"] is True

    challenge = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    assert challenge.status_code == 401

    refresh = client.post(
        "/crm/v1/auth/refresh",
        json={"refreshToken": enrolled["refreshToken"]},
    )
    assert refresh.status_code == 401


def test_revoke_with_bearer_access_token(auth_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Bearer Revoke App")
    challenge = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    ch = challenge.json()
    verify = client.post(
        "/crm/v1/auth/verify",
        json={
            "deviceId": enrolled["deviceId"],
            "challengeId": ch["challengeId"],
            "signature": _sign(enrolled["private_key"], ch["nonce"]),
        },
    )
    access = verify.json()["accessToken"]

    revoke = client.post(
        "/crm/v1/auth/revoke",
        json={},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert revoke.status_code == 200

    session = SessionLocal()
    try:
        device = session.query(CrmDevice).filter(CrmDevice.id == enrolled["deviceId"]).one()
        assert device.revoked_at is not None
        assert device.refresh_token_hash is None
    finally:
        session.close()


def test_consumed_and_expired_challenge_rejected(auth_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Challenge Reuse App")

    challenge = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    ch = challenge.json()
    signature = _sign(enrolled["private_key"], ch["nonce"])
    payload = {
        "deviceId": enrolled["deviceId"],
        "challengeId": ch["challengeId"],
        "signature": signature,
    }
    assert client.post("/crm/v1/auth/verify", json=payload).status_code == 200
    reused = client.post("/crm/v1/auth/verify", json=payload)
    assert reused.status_code == 401
    assert "already used" in reused.json()["message"]

    challenge2 = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    ch2 = challenge2.json()
    session = SessionLocal()
    try:
        row = (
            session.query(CrmAuthChallenge)
            .filter(CrmAuthChallenge.id == ch2["challengeId"])
            .one()
        )
        row.expires_at = datetime.now(tz=UTC) - timedelta(seconds=1)
        session.commit()
    finally:
        session.close()

    expired = client.post(
        "/crm/v1/auth/verify",
        json={
            "deviceId": enrolled["deviceId"],
            "challengeId": ch2["challengeId"],
            "signature": _sign(enrolled["private_key"], ch2["nonce"]),
        },
    )
    assert expired.status_code == 401
    assert "expired" in expired.json()["message"]


def test_bad_signature_fails_and_audits(auth_workspace: int):
    client = TestClient(app)
    enrolled = _enroll(client, title="Bad Sig App")
    challenge = client.post(
        "/crm/v1/auth/challenge",
        json={"deviceId": enrolled["deviceId"]},
    )
    ch = challenge.json()
    # Sign with a different key
    _, other_key = _keypair()
    bad = client.post(
        "/crm/v1/auth/verify",
        json={
            "deviceId": enrolled["deviceId"],
            "challengeId": ch["challengeId"],
            "signature": _sign(other_key, ch["nonce"]),
        },
    )
    assert bad.status_code == 401
    assert "signature" in bad.json()["message"].lower()

    session = SessionLocal()
    try:
        fails = (
            session.query(CrmAuditEvent)
            .filter(CrmAuditEvent.event_type == "verify_fail")
            .all()
        )
        assert any(e.detail == "bad_signature" for e in fails)
        # Refresh hash must not equal the raw token
        device = session.query(CrmDevice).filter(CrmDevice.id == enrolled["deviceId"]).one()
        assert device.refresh_token_hash == hash_opaque_token(enrolled["refreshToken"])
        assert device.refresh_token_hash != enrolled["refreshToken"]
    finally:
        session.close()
