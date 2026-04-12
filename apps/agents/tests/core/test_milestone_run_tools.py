"""Unit tests for milestone run tool pool."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _tools_for_context(
    context: dict[str, Any],
    *,
    client: Any | None = None,
    skill_id: str | None = None,
) -> list[Any]:
    from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools

    c = client if client is not None else MagicMock(spec=AsyncMock)
    return make_milestone_run_tools(
        context,
        "ms-1",
        42,
        "user-1",
        client=c,
        skill_id=skill_id,
    )


def test_make_milestone_run_tools_has_no_write_result() -> None:
    tools = _tools_for_context({})
    names = [getattr(t, "name", "") for t in tools]
    assert len(tools) == 6
    assert "write_result" not in names


def test_make_milestone_run_tools_restaurant_brand_brief_adds_analytics_tool() -> None:
    tools = _tools_for_context({}, skill_id="restaurant_brand_brief")
    names = {getattr(t, "name", "") for t in tools}
    assert "get_brand_brief_analytics_context_json" in names


def test_make_milestone_run_tools_promotion_adds_analytics_tools() -> None:
    ctx: dict[str, Any] = {"workflow_id": "wf-1"}
    tools = _tools_for_context(ctx, skill_id="promotion_candidates")
    names = {getattr(t, "name", "") for t in tools}
    assert "get_location_json" in names
    assert "get_promotion_menu_items_json" in names
    assert "get_instagram_signals_json" in names
    assert "get_menu_items_catalog_json" in names
    assert "get_prior_brand_brief_markdown" in names


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
    assert len(tools) == 7
    assert "menu_promotions_mock_api" in names


def test_read_goal_returns_context_goal() -> None:
    ctx = {"goal": "Ship the campaign"}
    tools = _tools_for_context(ctx)
    read_goal = tools[0]
    out = read_goal.invoke({})
    assert out == "Ship the campaign"


def test_read_criteria_returns_json() -> None:
    ctx = {
        "criteria": [
            {"id": "c1", "requirement": "Has numbers"},
        ]
    }
    tools = _tools_for_context(ctx)
    read_criteria = tools[1]
    out = read_criteria.invoke({})
    assert '"id": "c1"' in out
    assert "Has numbers" in out


def test_read_data_returns_raw_data() -> None:
    ctx = {"raw_data": "# Notes\n\nHello"}
    tools = _tools_for_context(ctx)
    read_data = tools[2]
    out = read_data.invoke({})
    assert out.startswith("# Notes")


def test_read_prior_milestones_returns_context() -> None:
    ctx = {"prior_milestones_data": "## Campaign Brief\n\n**Start:** 2026-05-01"}
    tools = _tools_for_context(ctx)
    read_prior = tools[3]
    out = read_prior.invoke({})
    assert "Campaign Brief" in out
    assert "2026-05-01" in out


def test_read_prior_milestones_empty_shows_message() -> None:
    ctx: dict[str, Any] = {}
    tools = _tools_for_context(ctx)
    read_prior = tools[3]
    out = read_prior.invoke({})
    assert "No prior milestone data available" in out


@pytest.mark.asyncio
async def test_get_public_holidays_formats_list() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.fetch_public_holidays_for_milestone",
        new=AsyncMock(
            return_value=(
                [
                    {"date": "2025-01-01", "name": "New Year's Day", "localName": "New Year's Day"},
                ],
                None,
            )
        ),
    ):
        tools = _tools_for_context(ctx, client=client)
        get_public_holidays = tools[4]
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
        "agents_app.agents.core.milestone_run.tools.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-9"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = tools[5]
        out = await write_result_data.ainvoke({"new_data": "Updated body"})

    mock_upsert.assert_awaited_once()
    assert ctx.get("result_data") == "Updated body"
    assert "md-9" in out
