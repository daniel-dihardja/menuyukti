"""Chat ReAct tool list (includes optional Tavily ``search_web``)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def _clear_tavily_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)


def test_chat_tools_list_excludes_search_web_without_key() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list()]
    assert "search_web" not in names
    assert "generate_instagram_post_image" not in names
    assert "get_workflow_overview" in names
    assert "get_milestone" in names
    assert "update_milestone_input" in names
    assert "get_location_data" in names


def test_chat_tools_list_includes_search_web_with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    with patch("agents_app.agents.core.tavily_search_tool.TavilySearch") as mock_cls:
        mock_cls.return_value.ainvoke = AsyncMock(return_value={"results": []})
        from agents_app.agents.core.chat.graph import chat_tools_list

        names = [getattr(t, "name", "") for t in chat_tools_list()]
    assert "search_web" in names


def test_chat_tools_list_includes_post_image_when_requested() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(include_post_image=True)]
    assert "generate_instagram_post_image" in names


def test_chat_tools_list_omits_workflow_tools_without_workflow() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(workflow_id=False)]
    assert "get_workflow_overview" not in names
    assert "get_milestone" not in names
    assert "update_milestone_input" not in names
    assert "get_location_data" in names


def test_chat_tools_list_omits_update_without_milestone() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [
        getattr(t, "name", "")
        for t in chat_tools_list(workflow_id=True, milestone_id=False)
    ]
    assert "get_milestone" in names
    assert "update_milestone_input" not in names


def test_chat_tools_list_omits_location_without_location_id() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(location_id=False)]
    assert "get_location_data" not in names


def test_chat_tools_list_from_config_gates_by_context() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list_from_config

    agent_only = chat_tools_list_from_config({"user_id": "u1"})
    agent_names = [getattr(t, "name", "") for t in agent_only]
    assert "get_milestone" not in agent_names
    assert "get_location_data" not in agent_names

    wf = chat_tools_list_from_config(
        {"workflow_id": "100", "location_id": 7, "user_id": "u1"}
    )
    wf_names = [getattr(t, "name", "") for t in wf]
    assert "get_milestone" in wf_names
    assert "update_milestone_input" not in wf_names
    assert "get_location_data" in wf_names

    selected = chat_tools_list_from_config(
        {
            "workflow_id": "100",
            "milestone_id": "42",
            "location_id": 7,
            "user_id": "u1",
        }
    )
    selected_names = [getattr(t, "name", "") for t in selected]
    assert "update_milestone_input" in selected_names
