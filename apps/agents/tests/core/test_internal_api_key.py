"""Tests for agents InternalApiKeyMiddleware."""

from unittest.mock import AsyncMock, patch

import pytest
from agents_app.server import app
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_health_open_when_key_configured(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_API_KEY", "agents-secret")
    monkeypatch.delenv("GRAPHQL_INTERNAL_API_KEY", raising=False)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_forbidden_without_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_API_KEY", "agents-secret")
    monkeypatch.delenv("GRAPHQL_INTERNAL_API_KEY", raising=False)
    response = client.post(
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": "Hello"}], "workflow_id": "1"},
    )
    assert response.status_code == 403


def test_chat_forbidden_with_wrong_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("INTERNAL_API_KEY", "agents-secret")
    monkeypatch.delenv("GRAPHQL_INTERNAL_API_KEY", raising=False)
    response = client.post(
        "/chat",
        headers={
            "X-Menuyukti-User-Id": "user-1",
            "X-Internal-Api-Key": "wrong",
        },
        json={"messages": [{"role": "user", "content": "Hello"}], "workflow_id": "1"},
    )
    assert response.status_code == 403


@patch("agents_app.routers.format_markdown.format_markdown", new_callable=AsyncMock)
def test_format_markdown_accepts_matching_key(
    mock_fmt: AsyncMock,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("INTERNAL_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "shared-secret")
    mock_fmt.return_value = "# Done"
    response = client.post(
        "/format-markdown",
        headers={
            "X-Menuyukti-User-Id": "user-1",
            "X-Internal-Api-Key": "shared-secret",
        },
        json={"content": "raw", "preset": "milestone-data"},
    )
    assert response.status_code == 200
    assert response.json() == {"formatted": "# Done"}
