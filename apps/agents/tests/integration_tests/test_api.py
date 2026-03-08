"""Integration tests for the FastAPI agent HTTP API."""

import os

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


def test_invoke_stream_accepts_intent_category() -> None:
    """POST /invoke/stream with intent_category returns 200 and streams response."""
    client = TestClient(app)
    response = client.post(
        "/invoke/stream",
        json={"message": "Hello", "intent_category": "planning"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    text = response.text
    assert "[DONE]" in text


def test_invoke_stream_defaults_intent_category() -> None:
    """POST /invoke/stream without intent_category uses default planning and returns 200."""
    client = TestClient(app)
    response = client.post("/invoke/stream", json={"message": "Hello"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
    assert "[DONE]" in response.text
