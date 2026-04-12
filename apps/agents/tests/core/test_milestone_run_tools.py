"""Unit tests for milestone run tool pool."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _tool_by_name(tools: list[Any], name: str) -> Any:
    for t in tools:
        if getattr(t, "name", "") == name:
            return t
    raise AssertionError(f"no tool named {name!r}")


def _tools_for_context(
    context: dict[str, Any],
    *,
    client: Any | None = None,
    extra_tool_ids: list[str] | None = None,
) -> list[Any]:
    from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools

    c = client if client is not None else MagicMock(spec=AsyncMock)
    return make_milestone_run_tools(
        context,
        "ms-1",
        42,
        "user-1",
        client=c,
        extra_tool_ids=extra_tool_ids or (),
    )


def test_make_milestone_run_tools_core_only_has_five_builtins() -> None:
    tools = _tools_for_context({})
    names = [getattr(t, "name", "") for t in tools]
    assert len(tools) == 5
    assert "get_public_holidays" not in names
    assert "write_result" not in names
    assert "write_result_data" in names


def test_make_milestone_run_tools_appends_workspace_adapter_tools() -> None:
    ctx: dict[str, Any] = {
        "api_adapter_tools": [
            {
                "tool_key": "menu_promotions_mock_api",
                "url": "http://127.0.0.1:3090/api/mock",
                "description": "Mock promotions JSON",
            },
        ],
    }
    tools = _tools_for_context(ctx)
    names = [getattr(t, "name", "") for t in tools]
    assert len(tools) == 6
    assert "menu_promotions_mock_api" in names


def test_read_goal_returns_context_goal() -> None:
    ctx = {"goal": "Ship the campaign"}
    tools = _tools_for_context(ctx)
    read_goal = _tool_by_name(tools, "read_goal")
    out = read_goal.invoke({})
    assert out == "Ship the campaign"


def test_read_criteria_returns_json() -> None:
    ctx = {
        "criteria": [
            {"id": "c1", "requirement": "Has numbers"},
        ]
    }
    tools = _tools_for_context(ctx)
    read_criteria = _tool_by_name(tools, "read_criteria")
    out = read_criteria.invoke({})
    assert '"id": "c1"' in out
    assert "Has numbers" in out


def test_read_data_returns_raw_data() -> None:
    ctx = {"raw_data": "# Notes\n\nHello"}
    tools = _tools_for_context(ctx)
    read_data = _tool_by_name(tools, "read_data")
    out = read_data.invoke({})
    assert out.startswith("# Notes")


def test_read_prior_milestones_returns_context() -> None:
    ctx = {"prior_milestones_data": "## Campaign Brief\n\n**Start:** 2026-05-01"}
    tools = _tools_for_context(ctx)
    read_prior = _tool_by_name(tools, "read_prior_milestones_data")
    out = read_prior.invoke({})
    assert "Campaign Brief" in out
    assert "2026-05-01" in out


def test_read_prior_milestones_empty_shows_message() -> None:
    ctx: dict[str, Any] = {}
    tools = _tools_for_context(ctx)
    read_prior = _tool_by_name(tools, "read_prior_milestones_data")
    out = read_prior.invoke({})
    assert "No prior milestone data available" in out


def test_extra_tool_ids_includes_get_public_holidays() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_public_holidays"])
    names = [getattr(t, "name", "") for t in tools]
    assert "get_public_holidays" in names
    assert names.index("get_public_holidays") < names.index("write_result_data")


@pytest.mark.asyncio
async def test_get_public_holidays_formats_list() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_public_holidays.fetch_public_holidays_for_milestone",
        new=AsyncMock(
            return_value=(
                [
                    {"date": "2025-01-01", "name": "New Year's Day", "localName": "New Year's Day"},
                ],
                None,
            )
        ),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_public_holidays"])
        get_public_holidays = _tool_by_name(tools, "get_public_holidays")
        out = await get_public_holidays.ainvoke(
            {"start_date": "2025-01-01", "end_date": "2025-01-31"}
        )

    assert "2025-01-01" in out
    assert "New Year's Day" in out


@pytest.mark.asyncio
async def test_write_result_data_upserts_and_updates_context() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-9"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": "Updated body"})

    mock_upsert.assert_awaited_once()
    assert ctx.get("result_data") == "Updated body"
    assert "md-9" in out


def test_validate_extra_tool_ids_rejects_unknown() -> None:
    from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids

    with pytest.raises(ValueError, match="Unknown extra_tools"):
        validate_extra_tool_ids(["not_a_real_tool"])


def test_validate_extra_tool_ids_rejects_reserved() -> None:
    from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids

    with pytest.raises(ValueError, match="reserved"):
        validate_extra_tool_ids(["read_goal"])
