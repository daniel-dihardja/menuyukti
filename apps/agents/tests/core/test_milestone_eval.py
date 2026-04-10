"""Unit tests for milestone evaluation nodes (used by milestone run finalize)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_eval import nodes
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
