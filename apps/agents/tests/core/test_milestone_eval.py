"""Unit tests for milestone evaluation nodes (used by milestone run finalize)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_eval import nodes
from agents_app.agents.core.milestone_eval.prompts import synthesis_human_message
from agents_app.agents.core.milestone_eval.state import MilestoneEvalState
from langgraph.types import Send


def _base_state(**overrides: Any) -> MilestoneEvalState:
    base: dict[str, Any] = {
        "milestone_id": "ms-1",
        "location_id": 1,
        "user_id": "user-1",
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "evaluated": [],
        "result_summary": "",
        "result_node_id": None,
    }
    base.update(overrides)
    return base  # type: ignore[return-value]


def test_route_after_fetch_empty_goes_to_synthesize() -> None:
    assert nodes.route_after_fetch(_base_state()) == "synthesize"


def test_route_after_fetch_emits_send_workers() -> None:
    state = _base_state(
        criteria=[{"id": "c1", "requirement": "Must have data"}],
    )
    out = nodes.route_after_fetch(state)
    assert isinstance(out, list)
    assert len(out) == 1
    assert isinstance(out[0], Send)
    assert out[0].node == "evaluate_criterion"


@pytest.mark.asyncio
async def test_fetch_context_parses_goal_milestonedata_passcriteria() -> None:
    fake_children = [
        {
            "nodeType": "goal",
            "data": {"goal": "Increase covers"},
        },
        {
            "node_type": "milestonedata",
            "data": {"data": "Sales up 10%"},
        },
        {
            "nodeType": "passcriteria",
            "id": "pc-1",
            "data": {"requirement": "Has baseline"},
        },
    ]
    with (
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_children",
            new=AsyncMock(return_value=fake_children),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await nodes.fetch_context(
            _base_state(),
            client=MagicMock(spec=AsyncMock),
        )
    assert out["goal"] == "Increase covers"
    assert out["raw_data"] == "Sales up 10%"
    assert out["criteria"] == [{"id": "pc-1", "requirement": "Has baseline"}]


@pytest.mark.asyncio
async def test_fetch_context_appends_prior_milestone_context_when_workflow_present() -> None:
    fake_children = [
        {"nodeType": "goal", "data": {"goal": "Schedule posts"}},
        {"nodeType": "milestonedata", "data": {"data": '{"schedules":[]}' }},
        {
            "nodeType": "passcriteria",
            "id": "pc-2",
            "data": {"requirement": "Within campaign window"},
        },
    ]
    with (
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_children",
            new=AsyncMock(return_value=fake_children),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_prior_milestones_data_for_eval",
            new=AsyncMock(return_value="## Dates\n\nstartDate: 2026-06-01\nendDate: 2026-06-30"),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await nodes.fetch_context(
            _base_state(workflow_id="wf-1"),
            client=MagicMock(spec=AsyncMock),
        )
    assert "Prior milestone context" in out["raw_data"]
    assert "2026-06-01" in out["raw_data"]


def test_synthesis_human_message_includes_optional_input_notes_block() -> None:
    msg = synthesis_human_message(
        "Build a brand brief",
        [{"id": "pc-1", "status": "pass", "requirement": "Has pillars", "reasoning": "present"}],
        "The topic of the campaign is the soccer world cup.",
    )
    assert "Optional milestone input notes:" in msg
    assert "soccer world cup" in msg


def test_optional_input_usage_line_marks_used_when_notes_present() -> None:
    line = nodes._optional_input_usage_line(
        "The topic of the campaign is the soccer world cup.",
    )
    assert line.startswith("Optional input usage: used —")
    assert "single instruction string" in line


def test_enforce_optional_input_line_always_marks_used_when_notes_present() -> None:
    summary = (
        "Milestone achieved with clear brief data.\n\n"
        "Optional input usage: not used — Optional input conflicts with available signals."
    )
    fixed = nodes._enforce_optional_input_line(
        summary,
        "The topic of the campaign is the soccer world cup.",
    )
    assert fixed.count("Optional input usage:") == 1
    assert "Optional input usage: used —" in fixed


def test_enforce_optional_input_line_removes_inline_existing_fragment() -> None:
    summary = (
        "Milestone achieved with clear brief data. Optional input usage: not used — "
        "the focus remained strictly on factual elements."
    )
    fixed = nodes._enforce_optional_input_line(
        summary,
        "The topic of the campaign is the soccer world cup.",
    )
    assert fixed.count("Optional input usage:") == 1
    assert "Optional input usage: used —" in fixed
