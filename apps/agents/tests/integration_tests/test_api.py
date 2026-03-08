"""Integration tests for the FastAPI agent HTTP API."""

import os
from unittest.mock import AsyncMock, patch

# Set dummy key before importing agent (graph.py instantiates ChatOpenAI at import).
os.environ.setdefault("OPENAI_API_KEY", "sk-test-dummy")

from fastapi.testclient import TestClient

from agent.api import app


def test_health() -> None:
    """GET /health returns 200 and status ok."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_invoke_success() -> None:
    """POST /invoke with valid body returns 200 and agent response."""
    with patch("agent.api.graph") as mock_graph:
        mock_graph.ainvoke = AsyncMock(return_value={"response": "Hello back"})
        client = TestClient(app)
        response = client.post("/invoke", json={"message": "Hello"})
    assert response.status_code == 200
    assert response.json() == {"response": "Hello back"}


def test_invoke_missing_message() -> None:
    """POST /invoke without message returns 422."""
    client = TestClient(app)
    response = client.post("/invoke", json={})
    assert response.status_code == 422
