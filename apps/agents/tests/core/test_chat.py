"""HTTP tests for streaming chat."""

from unittest.mock import ANY, MagicMock, patch

import httpx
import pytest
from agents_app.agents.core.chat.graph import build_chat_graph
from agents_app.server import app
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessageChunk


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_chat_invalid_role(client: TestClient) -> None:
    response = client.post(
        "/chat",
        json={"messages": [{"role": "system", "content": "nope"}]},
    )
    assert response.status_code == 422


@patch("agents_app.routers.chat.build_chat_graph")
def test_chat_stream_sse(mock_build_graph: MagicMock, client: TestClient) -> None:
    """Patch the compiled graph so we exercise SSE formatting without calling OpenAI."""

    async def fake_astream_events(*_args, **_kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": AIMessageChunk(content="Hi")},
        }
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": AIMessageChunk(content=" there")},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = fake_astream_events
    mock_build_graph.return_value = mock_graph

    with client.stream(
        "POST",
        "/chat",
        json={"messages": [{"role": "user", "content": "Hello"}]},
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
        assert "Hi" in text
        assert "there" in text
        assert "data:" in text
        mock_build_graph.assert_called_once_with(
            workflow_id=None,
            milestone_id=None,
            location_id=None,
            user_id=None,
            http_client=ANY,
        )


@patch("agents_app.routers.chat.build_chat_graph")
def test_chat_stream_passes_milestone_id(mock_build_graph: MagicMock, client: TestClient) -> None:
    async def fake_astream_events(*_args, **_kwargs):
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": AIMessageChunk(content="ok")},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = fake_astream_events
    mock_build_graph.return_value = mock_graph

    with client.stream(
        "POST",
        "/chat",
        json={
            "messages": [{"role": "user", "content": "Run"}],
            "milestone_id": "42",
        },
    ) as response:
        assert response.status_code == 200
    mock_build_graph.assert_called_once_with(
        workflow_id=None,
        milestone_id="42",
        location_id=None,
        user_id=None,
        http_client=ANY,
    )


def test_build_chat_graph_compiles_simple_llm() -> None:
    """Without milestone + auth context, graph is a single LLM node (no tools)."""
    graph = build_chat_graph()
    assert graph is not None


@pytest.mark.asyncio
async def test_build_chat_graph_compiles_react_with_milestone_tool() -> None:
    """With milestone_id, location, user, and client, graph is a ReAct agent with get_milestone_data."""
    async with httpx.AsyncClient() as client:
        graph = build_chat_graph(
            milestone_id="1",
            location_id=1,
            user_id="test-user",
            http_client=client,
        )
    assert graph is not None
