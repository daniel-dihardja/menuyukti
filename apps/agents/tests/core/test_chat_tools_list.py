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
    assert "get_workflow_overview" in names
    assert "get_milestone_data" in names
    assert "get_milestone_preset_data_for_milestone" not in names
    assert "get_location_data" in names


def test_chat_tools_list_includes_search_web_with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    with patch("agents_app.agents.core.tavily_search_tool.TavilySearch") as mock_cls:
        mock_cls.return_value.ainvoke = AsyncMock(return_value={"results": []})
        from agents_app.agents.core.chat.graph import chat_tools_list

        names = [getattr(t, "name", "") for t in chat_tools_list()]
    assert "search_web" in names
