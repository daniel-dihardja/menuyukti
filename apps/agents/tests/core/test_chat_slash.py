"""Tests for deterministic chat slash → get_milestone routing."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from agents_app.routers.chat import parse_slash_get_milestone
from agents_app.server import app
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        ("/input", {"fields": ["input"]}),
        ("  /data  ", {"fields": ["data"]}),
        ("/help", {"fields": ["help"]}),
        ("/preset 42", {"fields": ["data"], "milestone_id": "42"}),
        ("/preset  99", {"fields": ["data"], "milestone_id": "99"}),
        ("/input please", None),
        ("hello", None),
        ([{"type": "text", "text": "/input"}], None),
    ],
)
def test_parse_slash_get_milestone(content: object, expected: dict | None) -> None:
    assert parse_slash_get_milestone(content) == expected


def test_chat_stream_slash_input_bypasses_graph(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    mock_graph = MagicMock()
    mock_graph.astream = MagicMock(side_effect=AssertionError("graph should not run for slash"))
    client.app.state.chat_graph = mock_graph

    tool_mock = MagicMock()
    tool_mock.ainvoke = AsyncMock(return_value="## Input (milestoneInput)\n(not set)")
    monkeypatch.setattr("agents_app.routers.chat.get_milestone", tool_mock)

    with client.stream(
        "POST",
        "/chat",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "messages": [{"role": "user", "content": "/input"}],
            "workflow_id": "10",
            "milestone_id": "42",
            "location_id": 7,
        },
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
        assert "tool_start" in text
        assert "get_milestone" in text
        assert "tool_end" in text
        assert "milestoneInput" in text

    tool_mock.ainvoke.assert_awaited_once()
    call_args = tool_mock.ainvoke.await_args
    assert call_args is not None
    assert call_args.args[0] == {"fields": ["input"]}
    mock_graph.astream.assert_not_called()
