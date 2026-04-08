"""Unit tests for milestone eval nodes and SSE streaming adapter."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_eval import nodes
from agents_app.agents.core.milestone_eval.state import MilestoneEvalState
from agents_app.agents.core.milestone_eval.stream import iter_milestone_eval_sse_lines
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
async def test_iter_milestone_eval_sse_lines_yields_done_payload() -> None:
    async def fake_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "evaluated": [{"id": "a", "status": "pass"}],
                "result_node_id": "node-99",
                "result_summary": "All good",
            },
        )

    mock_graph = MagicMock()
    mock_graph.astream = fake_astream

    with patch(
        "agents_app.agents.core.milestone_eval.stream.build_milestone_eval_graph",
        return_value=mock_graph,
    ):
        lines: list[str] = []
        async for line in iter_milestone_eval_sse_lines(
            client=MagicMock(),
            milestone_id="m1",
            location_id=2,
            user_id="u1",
        ):
            lines.append(line)

    assert len(lines) == 1
    assert "done" in lines[0]
    assert "node-99" in lines[0]
    assert "All good" in lines[0]
