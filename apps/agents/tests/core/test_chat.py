"""HTTP tests for streaming chat."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from agents_app.server import app
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, AIMessageChunk, ToolMessage


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _stub_workflow_catalog(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid real GraphQL during chat HTTP tests; return a fixed catalog for workflow chats."""

    async def fake_catalog(**_kwargs: object) -> str:
        return "# Workflow overview\n\n## 1. Stub\n- **id**: 1\n"

    monkeypatch.setattr(
        "agents_app.routers.chat.load_workflow_catalog_markdown",
        AsyncMock(side_effect=fake_catalog),
    )


def _install_mock_astream(
    mock_graph: MagicMock,
    *,
    chunks: list[tuple[str, object]] | None = None,
    capture_config: dict | None = None,
) -> None:
    async def fake_astream(_input, config, **_kwargs):
        if capture_config is not None:
            capture_config["config"] = config
        for item in chunks or []:
            yield item

    mock_graph.astream = MagicMock(side_effect=fake_astream)


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
    mock_graph.astream.assert_not_called()


def test_chat_invalid_model_returns_400(client: TestClient) -> None:
    mock_graph = MagicMock()
    client.app.state.chat_graph = mock_graph
    response = client.post(
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "workflow_id": "10",
            "model": "not-a-real/model-id-for-chat",
        },
    )
    assert response.status_code == 400
    mock_graph.astream.assert_not_called()


def test_chat_omits_gateway_model_in_config_when_model_not_sent(client: TestClient) -> None:
    captured: dict = {}
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[("messages", (AIMessageChunk(content="x"), {}))],
        capture_config=captured,
    )
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": "Hi"}], "workflow_id": "10"},
    ) as response:
        assert response.status_code == 200

    assert "chat_gateway_model" not in captured["config"]["configurable"]


def test_chat_valid_model_passed_in_config(client: TestClient) -> None:
    captured: dict = {}
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[("messages", (AIMessageChunk(content="ok"), {}))],
        capture_config=captured,
    )
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "workflow_id": "10",
            "model": "openai/gpt-4o",
        },
    ) as response:
        assert response.status_code == 200

    assert captured["config"]["configurable"]["chat_gateway_model"] == "openai/gpt-4o"


def test_chat_stream_sse(client: TestClient) -> None:
    """Patch app.state.chat_graph so we exercise SSE formatting without calling OpenAI."""
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[
            ("messages", (AIMessageChunk(content="Hi"), {})),
            ("messages", (AIMessageChunk(content=" there"), {})),
        ],
    )
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

    mock_graph.astream.assert_called_once()
    args, kwargs = mock_graph.astream.call_args
    assert len(args[0]["messages"]) == 1
    cfg = args[1]
    assert cfg["configurable"]["thread_id"] == "user-1:wf:10"
    assert kwargs.get("stream_mode") == ["messages", "updates"]


def test_chat_stream_list_content_blocks(client: TestClient) -> None:
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[
            (
                "messages",
                (
                    AIMessageChunk(content=[{"type": "text", "text": "Hello"}]),
                    {},
                ),
            ),
        ],
    )
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": "Hello"}], "workflow_id": "10"},
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
        assert "Hello" in text


def test_chat_stream_tool_status_sse(client: TestClient) -> None:
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[
            (
                "updates",
                {
                    "agent": {
                        "messages": [
                            AIMessage(
                                content="",
                                tool_calls=[{"name": "get_milestone_data", "id": "1", "args": {}}],
                            ),
                        ],
                    },
                },
            ),
            (
                "updates",
                {
                    "tools": {
                        "messages": [
                            ToolMessage(content="ok", tool_call_id="1", name="get_milestone_data")
                        ],
                    },
                },
            ),
            ("messages", (AIMessageChunk(content="Done"), {})),
        ],
    )
    client.app.state.chat_graph = mock_graph

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": "Hello"}], "workflow_id": "10"},
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
        assert "tool_start" in text or '"status": "tool_start"' in text
        assert "get_milestone_data" in text
        assert "tool_end" in text or '"status": "tool_end"' in text
        assert "Done" in text


def test_chat_stream_passes_milestone_in_config(client: TestClient) -> None:
    captured: dict = {}
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[("messages", (AIMessageChunk(content="ok"), {}))],
        capture_config=captured,
    )
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
    assert "# Workflow overview" in captured["config"]["configurable"]["workflow_catalog_markdown"]


def test_chat_workflow_session_suffixes_thread_id(client: TestClient) -> None:
    captured: dict = {}
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[("messages", (AIMessageChunk(content="x"), {}))],
        capture_config=captured,
    )
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
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[("messages", (AIMessageChunk(content="x"), {}))],
        capture_config=captured,
    )
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
    assert "workflow_catalog_markdown" not in captured["config"]["configurable"]


def test_chat_multimodal_user_content(client: TestClient) -> None:
    mock_graph = MagicMock()
    _install_mock_astream(
        mock_graph,
        chunks=[("messages", (AIMessageChunk(content="Looks tasty"), {}))],
    )
    client.app.state.chat_graph = mock_graph

    data_url = "data:image/png;base64,iVBORw0KGgo="
    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "workflow_id": "10",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this dish"},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
        },
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
        assert "Looks tasty" in text

    args, _kwargs = mock_graph.astream.call_args
    human = args[0]["messages"][0]
    assert isinstance(human.content, list)
    assert human.content[0]["type"] == "text"
    assert human.content[1]["type"] == "image_url"


def test_chat_empty_content_rejected(client: TestClient) -> None:
    mock_graph = MagicMock()
    client.app.state.chat_graph = mock_graph
    response = client.post(
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={"messages": [{"role": "user", "content": ""}], "workflow_id": "10"},
    )
    assert response.status_code == 422
    mock_graph.astream.assert_not_called()


def test_lifespan_compiles_chat_graph(client: TestClient) -> None:
    assert client.app.state.chat_graph is not None
    assert client.app.state.chat_checkpointer is not None
