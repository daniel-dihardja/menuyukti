"""Tests for milestone run LangGraph wiring."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import SkillSelections, build_milestone_run_graph


async def _empty_astream_events(*_a: object, **_k: object):
    """Async generator that yields no LangGraph stream events."""
    if False:  # pragma: no cover
        yield None


def test_build_milestone_run_graph_compiles() -> None:
    client = MagicMock(spec=AsyncMock)
    graph = build_milestone_run_graph(client)
    assert graph is not None


@pytest.mark.asyncio
async def test_graph_runs_fetch_then_mock_agent() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_structured = MagicMock()
    mock_structured.ainvoke = AsyncMock(return_value=SkillSelections(skill_ids=["generic"]))
    mock_with_structured = MagicMock(return_value=mock_structured)

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
            "agents_app.agents.core.milestone_run.graph.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.get_llm_structured",
            return_value=MagicMock(with_structured_output=mock_with_structured),
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
        mock_agent.astream_events = MagicMock(side_effect=_empty_astream_events)
        mock_create.return_value = mock_agent
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "workflow_id": None,
                "goal": "",
                "raw_data": "",
                "criteria": [],
                "prior_milestones_data": "",
                "selected_skill_id": None,
                "selected_skill_ids": [],
                "current_skill_index": 0,
                "result_data": "",
                "milestonedata_written": False,
                "result_summary": "",
                "result_node_id": None,
                "last_criteria_verdicts": [],
            },
        )
    assert out.get("goal") == "G1"
    assert out.get("selected_skill_id") == "generic"
    assert out.get("selected_skill_ids") == ["generic"]
    mock_create.assert_called_once()
    assert mock_agent.astream_events.call_count == 1


@pytest.mark.asyncio
async def test_graph_runs_two_select_skills_sequentially() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_structured = MagicMock()
    mock_structured.ainvoke = AsyncMock(
        return_value=SkillSelections(skill_ids=["public_holidays", "generic"]),
    )
    mock_with_structured = MagicMock(return_value=mock_structured)

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
            "agents_app.agents.core.milestone_run.graph.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.get_llm_structured",
            return_value=MagicMock(with_structured_output=mock_with_structured),
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
        mock_agent.astream_events = MagicMock(side_effect=_empty_astream_events)
        mock_create.return_value = mock_agent
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "workflow_id": None,
                "goal": "",
                "raw_data": "",
                "criteria": [],
                "prior_milestones_data": "",
                "selected_skill_id": None,
                "selected_skill_ids": [],
                "current_skill_index": 0,
                "result_data": "",
                "milestonedata_written": False,
                "result_summary": "",
                "result_node_id": None,
                "last_criteria_verdicts": [],
            },
        )
    assert out.get("selected_skill_ids") == ["public_holidays", "generic"]
    assert mock_create.call_count == 2
    assert mock_agent.astream_events.call_count == 2
