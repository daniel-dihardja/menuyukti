"""Unit tests for milestone evaluation nodes (used by milestone run finalize)."""

from __future__ import annotations

import json
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
            "nodeType": "milestonedata",
            "data": {"summary": "Sales up 10%"},
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
    assert out["raw_data"] == json.dumps(
        {"summary": "Sales up 10%"},
        ensure_ascii=False,
        indent=2,
    )
    assert out["criteria"] == [{"id": "pc-1", "requirement": "Has baseline"}]


@pytest.mark.asyncio
async def test_fetch_context_appends_prior_milestone_context_when_workflow_present() -> None:
    fake_children = [
        {"nodeType": "goal", "data": {"goal": "Schedule posts"}},
        {"nodeType": "milestonedata", "data": {"schedules": []}},
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
        "Build a campaign_brief",
        [{"id": "pc-1", "status": "pass", "requirement": "Has pillars", "reasoning": "present"}],
        "The topic of the campaign is the soccer world cup.",
    )
    assert "Optional milestone input notes:" in msg
    assert "soccer world cup" in msg


def test_optional_input_usage_line_marks_used_when_notes_present() -> None:
    line = nodes._optional_input_usage_line(
        "The topic of the campaign is the soccer world cup.",
    )
    assert line == "Optional input usage: given."


def test_enforce_optional_input_line_marks_given_when_notes_present() -> None:
    summary = (
        "Milestone achieved with clear brief data.\n\n"
        "Optional input usage: not used — Optional input conflicts with available signals."
    )
    fixed = nodes._enforce_optional_input_line(
        summary,
        "The topic of the campaign is the soccer world cup.",
    )
    assert fixed.count("Optional input usage:") == 1
    assert "Optional input usage: given." in fixed


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
    assert "Optional input usage: given." in fixed


def test_enforce_optional_input_line_removes_period_terminated_inline_fragment() -> None:
    summary = "The milestone goal has been successfully achieved. Optional input usage: not given."
    fixed = nodes._enforce_optional_input_line(
        summary,
        "use the soccer world cup as campaign topic",
    )
    assert fixed.count("Optional input usage:") == 1
    assert "Optional input usage: not given." not in fixed
    assert fixed.endswith("Optional input usage: given.")


def test_optional_input_usage_line_marks_not_given_when_notes_absent() -> None:
    line = nodes._optional_input_usage_line("")
    assert line == "Optional input usage: not given."


def test_extract_milestone_input_notes_campaign_brief_trims() -> None:
    out = nodes._extract_milestone_input_notes(
        _base_state(
            milestone_input={
                "type": "restaurant_campaign_brief",
                "value": {"notes": "  owner context  "},
            },
        ),
    )
    assert out == "owner context"


def test_extract_milestone_input_notes_ignores_dates_type() -> None:
    assert (
        nodes._extract_milestone_input_notes(
            _base_state(
                milestone_input={
                    "type": "dates",
                    "value": {"startDate": "2026-01-01", "endDate": "2026-01-31"},
                },
            ),
        )
        == ""
    )


def test_extract_milestone_input_notes_promotion_candidates_trims() -> None:
    out = nodes._extract_milestone_input_notes(
        _base_state(
            milestone_input={
                "type": "promotion_candidates",
                "value": {"notes": "  brunch focus  "},
            },
        ),
    )
    assert out == "brunch focus"


def test_select_best_milestonedata_payload_prefers_larger_payload() -> None:
    sparse = {"summary": "ok"}
    rich = {
        "summary": "ok",
        "details": ["a", "b", "c"],
        "extras": {"foo": "bar", "baz": "qux"},
    }
    chosen = nodes._select_best_milestonedata_payload([sparse, rich])
    assert chosen is rich
