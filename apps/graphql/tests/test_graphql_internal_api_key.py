"""GraphQL mount requires X-Internal-Api-Key when the shared secret is configured."""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient


@pytest.fixture
def graphql_app_with_key(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("INTERNAL_API_KEY", "test-internal-key")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_REQUIRE_INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_ENV", "")
    monkeypatch.setenv("NODE_ENV", "test")

    import graphql.server as server_mod

    monkeypatch.setattr(server_mod, "INTERNAL_API_KEY", "test-internal-key")
    return server_mod.app


def test_graphql_requires_internal_api_key(graphql_app_with_key):
    client = TestClient(graphql_app_with_key)
    response = client.post(
        "/",
        json={"query": "{ __typename }"},
    )
    assert response.status_code == 403


def test_graphql_accepts_matching_internal_api_key(graphql_app_with_key):
    client = TestClient(graphql_app_with_key)
    response = client.post(
        "/",
        json={"query": "{ __typename }"},
        headers={"X-Internal-Api-Key": "test-internal-key"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body.get("data", {}).get("__typename") == "Query"
