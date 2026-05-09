"""HTTP tests for streaming chat."""

from unittest.mock import MagicMock

import pytest
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


def test_chat_missing_thread_key(client: TestClient) -> None:
    response = client.post(
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": "Hello"}]},
    )
    assert response.status_code == 400


def test_chat_missing_user_header(client: TestClient) -> None:
    response = client.post(
        "/chat",
        json={"messages": [{"role": "user", "content": "Hello"}], "workflow_id": "1"},
    )
    assert response.status_code == 401


def test_chat_invalid_role(client: TestClient) -> None:
    response = client.post(
        "/chat",
        json={"messages": [{"role": "system", "content": "nope"}]},
    )
    assert response.status_code == 422


def test_chat_not_exactly_one_message(client: TestClient) -> None:
    mock_graph = MagicMock()
    client.app.state.chat_graph = mock_graph
    response = client.post(
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "workflow_id": "1",
            "messages": [
                {"role": "user", "content": "a"},
                {"role": "user", "content": "b"},
            ],
        },
    )
    assert response.status_code == 400
    mock_graph.astream_events.assert_not_called()


def test_chat_stream_sse(client: TestClient) -> None:
    """Patch app.state.chat_graph so we exercise SSE formatting without calling OpenAI."""

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
    mock_graph.astream_events = MagicMock(side_effect=fake_astream_events)
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": "Hello"}], "workflow_id": "10"},
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
        assert "Hi" in text
        assert "there" in text
        assert "data:" in text

    mock_graph.astream_events.assert_called_once()
    args, _kwargs = mock_graph.astream_events.call_args
    assert len(args[0]["messages"]) == 1
    cfg = args[1]
    assert cfg["configurable"]["thread_id"] == "user-1:wf:10"


def test_chat_stream_passes_milestone_in_config(client: TestClient) -> None:
    captured: dict = {}

    async def fake_astream_events(_input, config, **_kwargs):
        captured["config"] = config
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": AIMessageChunk(content="ok")},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = MagicMock(side_effect=fake_astream_events)
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "messages": [{"role": "user", "content": "Run"}],
            "workflow_id": "99",
            "milestone_id": "42",
            "location_id": 7,
        },
    ) as response:
        assert response.status_code == 200

    assert captured["config"]["configurable"]["thread_id"] == "user-1:wf:99"
    assert captured["config"]["configurable"]["milestone_id"] == "42"
    assert captured["config"]["configurable"]["location_id"] == 7
    assert captured["config"]["configurable"]["user_id"] == "user-1"


def test_chat_workflow_session_suffixes_thread_id(client: TestClient) -> None:
    captured: dict = {}

    async def fake_astream_events(_input, config, **_kwargs):
        captured["config"] = config
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": AIMessageChunk(content="x")},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = MagicMock(side_effect=fake_astream_events)
    client.app.state.chat_graph = mock_graph

    session = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "messages": [{"role": "user", "content": "Hi"}],
            "workflow_id": "10",
            "workflow_chat_session_id": session,
        },
    ) as response:
        assert response.status_code == 200

    assert captured["config"]["configurable"]["thread_id"] == f"user-1:wf:10:sess:{session}"


def test_chat_agent_thread_id(client: TestClient) -> None:
    captured: dict = {}

    async def fake_astream_events(_input, config, **_kwargs):
        captured["config"] = config
        yield {
            "event": "on_chat_model_stream",
            "data": {"chunk": AIMessageChunk(content="x")},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = MagicMock(side_effect=fake_astream_events)
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "u-2"},
        json={
            "messages": [{"role": "user", "content": "Hey"}],
            "agent_thread_id": "opaque-uuid",
        },
    ) as response:
        assert response.status_code == 200

    assert captured["config"]["configurable"]["thread_id"] == "u-2:agent:opaque-uuid"


def test_lifespan_compiles_chat_graph(client: TestClient) -> None:
    assert client.app.state.chat_graph is not None
    assert client.app.state.chat_checkpointer is not None
