"""Unit tests for milestone run tool pool."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _tools_for_context(
    context: dict[str, Any],
    *,
    client: Any | None = None,
) -> list[Any]:
    from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools

    c = client if client is not None else MagicMock(spec=AsyncMock)
    return make_milestone_run_tools(
        context,
        "ms-1",
        42,
        "user-1",
        client=c,
    )


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


@pytest.mark.asyncio
async def test_write_result_data_upserts_and_updates_context() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-9"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = tools[3]
        out = await write_result_data.ainvoke({"new_data": "Updated body"})

    mock_upsert.assert_awaited_once()
    assert ctx.get("result_data") == "Updated body"
    assert "md-9" in out


@pytest.mark.asyncio
async def test_write_result_replaces_result_node_and_updates_context() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    fake_children = [
        {"nodeType": "result", "id": "old-res"},
    ]

    with (
        patch(
            "agents_app.agents.core.milestone_run.tools.fetch_milestone_children",
            new=AsyncMock(return_value=fake_children),
        ),
        patch(
            "agents_app.agents.core.milestone_run.tools.delete_node",
            new=AsyncMock(return_value=True),
        ) as mock_delete,
        patch(
            "agents_app.agents.core.milestone_run.tools.update_passcriteria_status",
            new=AsyncMock(return_value={}),
        ) as mock_pc,
        patch(
            "agents_app.agents.core.milestone_run.tools.create_result_node",
            new=AsyncMock(return_value={"id": "new-res"}),
        ) as mock_create,
    ):
        tools = _tools_for_context(ctx, client=client)
        write_result = tools[4]
        out = await write_result.ainvoke(
            {
                "summary": "Done",
                "criteria_verdicts": [
                    {
                        "id": "c1",
                        "requirement": "R1",
                        "status": "pass",
                        "reasoning": "ok",
                    }
                ],
            }
        )

    mock_delete.assert_awaited_once()
    mock_pc.assert_awaited_once_with("c1", "pass", "user-1", client=client)
    mock_create.assert_awaited_once()
    call_kw = mock_create.await_args
    assert call_kw is not None
    payload = call_kw[0][2]
    assert payload["summary"] == "Done"
    assert payload["passed"] == 1
    assert payload["total"] == 1
    assert ctx.get("result_summary") == "Done"
    assert ctx.get("result_node_id") == "new-res"
    assert ctx.get("last_criteria_verdicts") == [{"id": "c1", "status": "pass"}]
    assert "new-res" in out
