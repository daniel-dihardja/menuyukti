"""Tests for milestone run LangGraph wiring."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph


def test_build_milestone_run_graph_compiles() -> None:
    client = MagicMock(spec=AsyncMock)
    graph = build_milestone_run_graph(client)
    assert graph is not None


@pytest.mark.asyncio
async def test_graph_runs_fetch_then_mock_agent() -> None:
    client = MagicMock(spec=AsyncMock)
    with (
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_children",
            new=AsyncMock(
                return_value=[
                    {"nodeType": "goal", "data": {"goal": "G1"}},
                ],
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.get_llm",
            return_value=MagicMock(),
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.create_react_agent",
        ) as mock_create,
    ):
        mock_agent = MagicMock()
        mock_agent.ainvoke = AsyncMock(return_value={"messages": []})
        mock_create.return_value = mock_agent
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "raw_data": "",
                "criteria": [],
                "result_data": "",
                "result_summary": "",
                "result_node_id": None,
                "last_criteria_verdicts": [],
            },
        )
    assert out.get("goal") == "G1"
    mock_create.assert_called_once()
    mock_agent.ainvoke.assert_awaited_once()

