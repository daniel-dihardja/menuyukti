"""Tests for CopilotKit / AG-UI advisor endpoint auth and thread mapping."""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock

import pytest
from ag_ui.core.types import RunAgentInput
from agents_app.agents.core.chat.chat_run_config import resolve_thread_id
from agents_app.agents.core.copilotkit.agent import MenuyuktiLangGraphAGUIAgent
from copilotkit import LangGraphAGUIAgent
from fastapi.testclient import TestClient
from langchain_core.runnables import RunnableConfig


@pytest.fixture
def client() -> TestClient:
    from agents_app.server import app

    with TestClient(app) as test_client:
        yield test_client


def test_advisor_agui_requires_user_header(client: TestClient) -> None:
    res = client.post(
        "/copilotkit/advisor",
        headers={"X-Internal-Api-Key": ""},
        json={
            "thread_id": "thread-1",
            "run_id": "run-1",
            "messages": [],
            "tools": [],
            "context": [],
            "state": {},
            "forwarded_props": {},
        },
    )
    # Prefer 401 (missing user). If an env key is set in the process, middleware
    # may answer 403 first — either means the request was rejected without a user.
    assert res.status_code in (401, 403)


def test_advisor_agui_requires_user_header_when_key_cleared(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    res = client.post(
        "/copilotkit/advisor",
        json={
            "thread_id": "thread-1",
            "run_id": "run-1",
            "messages": [],
            "tools": [],
            "context": [],
            "state": {},
            "forwarded_props": {},
        },
    )
    assert res.status_code == 401
    assert "X-Menuyukti-User-Id" in (res.json().get("detail") or "")


def test_advisor_agui_health(client: TestClient) -> None:
    res = client.get("/copilotkit/advisor/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["agent"]["name"] == "advisor"


def test_advisor_agui_requires_thread_id(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    res = client.post(
        "/copilotkit/advisor",
        headers={"X-Menuyukti-User-Id": "user-1"},
        json={
            "thread_id": "",
            "run_id": "run-1",
            "messages": [],
            "tools": [],
            "context": [],
            "state": {},
            "forwarded_props": {},
        },
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_menuyukti_agent_rewrites_checkpointer_thread_id(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    product_thread = "agent-thread-xyz"
    expected = resolve_thread_id("user-abc", product_thread)
    captured: dict[str, Any] = {}

    async def fake_prepare(
        self: object,
        input: RunAgentInput,
        agent_state: object,
        config: RunnableConfig,
    ) -> object:
        captured["thread_id"] = input.thread_id
        conf = config.get("configurable") or {}
        captured["config_thread"] = conf.get("thread_id")
        captured["agent_thread_id"] = conf.get("agent_thread_id")
        return object()

    monkeypatch.setattr(LangGraphAGUIAgent, "prepare_stream", fake_prepare)

    graph = MagicMock()
    graph.nodes = {}
    agent = MenuyuktiLangGraphAGUIAgent(
        name="advisor",
        graph=graph,
        config={"configurable": {"user_id": "user-abc"}},
    )
    agent.active_run = {"id": "run-1"}

    await agent.prepare_stream(
        RunAgentInput(
            thread_id=product_thread,
            run_id="run-1",
            messages=[],
            tools=[],
            context=[],
            state={},
            forwarded_props={},
        ),
        object(),
        RunnableConfig(configurable={"user_id": "user-abc"}),
    )

    assert captured["thread_id"] == expected
    assert captured["config_thread"] == expected
    assert captured["agent_thread_id"] == product_thread


def test_advisor_agui_stream_smoke_without_llm(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Auth + stream wiring smoke: agent.run yields nothing; response is SSE."""
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")

    async def empty_run(self: object, input_data: object):  # noqa: ANN001
        if False:  # pragma: no cover
            yield None

    monkeypatch.setattr(
        "agents_app.routers.copilotkit.MenuyuktiLangGraphAGUIAgent.run",
        empty_run,
        raising=True,
    )

    res = client.post(
        "/copilotkit/advisor",
        headers={
            "X-Menuyukti-User-Id": "user-1",
            "X-Menuyukti-Chat-Mode": "general",
            "X-Menuyukti-Location-Id": "42",
        },
        json={
            "thread_id": "thread-smoke",
            "run_id": "run-smoke",
            "messages": [
                {
                    "id": "m1",
                    "role": "user",
                    "content": "hello",
                }
            ],
            "tools": [],
            "context": [],
            "state": {},
            "forwarded_props": {},
        },
    )
    assert res.status_code == 200
    assert "text/event-stream" in (res.headers.get("content-type") or "")
