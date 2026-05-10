"""Unit tests for milestone run core tools."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def _clear_tavily_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)


def _tool_by_name(tools: list[Any], name: str) -> Any:
    for t in tools:
        if getattr(t, "name", "") == name:
            return t
    raise AssertionError(f"no tool named {name!r}")


def _tools_for_context(context: dict[str, Any], *, client: Any | None = None) -> list[Any]:
    from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools

    c = client if client is not None else MagicMock(spec=AsyncMock)
    return make_milestone_run_tools(context, "ms-1", 42, "user-1", client=c)


def test_make_milestone_run_tools_core_builtins() -> None:
    tools = _tools_for_context({})
    names = [getattr(t, "name", "") for t in tools]
    assert names == [
        "read_goal",
        "read_criteria",
        "read_data",
        "read_prior_milestones_data",
        "write_result_data",
    ]


@pytest.mark.asyncio
async def test_make_milestone_run_tools_includes_search_web_when_key_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    with patch("agents_app.agents.core.tavily_search_tool.TavilySearch") as mock_cls:
        mock_cls.return_value.ainvoke = AsyncMock(
            return_value={
                "results": [{"title": "Example", "url": "https://example.com", "content": "x"}]
            }
        )
        tools = _tools_for_context({})
    names = [getattr(t, "name", "") for t in tools]
    assert names[:4] == ["read_goal", "read_criteria", "read_data", "read_prior_milestones_data"]
    assert names[4] == "search_web"
    assert names[5] == "write_result_data"
    out = await _tool_by_name(tools, "search_web").ainvoke({"query": "test query"})
    assert "Example" in out
    assert "https://example.com" in out


def test_read_goal_returns_context_goal() -> None:
    tools = _tools_for_context({"goal": "Ship the campaign"})
    assert _tool_by_name(tools, "read_goal").invoke({}) == "Ship the campaign"


def test_read_criteria_returns_json() -> None:
    tools = _tools_for_context({"criteria": [{"id": "c1", "requirement": "Has numbers"}]})
    out = _tool_by_name(tools, "read_criteria").invoke({})
    assert '"id": "c1"' in out
    assert "Has numbers" in out


def test_read_data_prefers_result_data() -> None:
    payload = json.dumps({"startDate": "2026-06-01"}, ensure_ascii=False, indent=2)
    tools = _tools_for_context({"result_data": payload})
    out = _tool_by_name(tools, "read_data").invoke({})
    assert '"startDate": "2026-06-01"' in out


def test_read_prior_milestones_returns_context_or_message() -> None:
    tools = _tools_for_context(
        {
            "prior_milestones_data": json.dumps(
                [{"title": "Campaign Brief", "data": {"startDate": "2026-05-01"}}],
                ensure_ascii=False,
            )
        }
    )
    assert "Campaign Brief" in _tool_by_name(tools, "read_prior_milestones_data").invoke({})
    assert "No prior milestone data available" in _tool_by_name(
        _tools_for_context({}), "read_prior_milestones_data"
    ).invoke({})


@pytest.mark.asyncio
async def test_write_result_data_upserts_and_updates_context() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)
    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-9"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        out = await _tool_by_name(tools, "write_result_data").ainvoke({"new_data": "Updated body"})
    mock_upsert.assert_awaited_once()
    assert ctx.get("result_data") == "Updated body"
    assert "md-9" in out
