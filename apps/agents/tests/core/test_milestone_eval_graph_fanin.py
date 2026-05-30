"""Integration tests for milestone eval graph fan-in (Send map-reduce)."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_eval.graph import build_milestone_eval_graph


@pytest.mark.asyncio
async def test_eval_graph_runs_synthesize_and_update_once_for_three_criteria() -> None:
    client = MagicMock()
    update_calls = 0
    synthesize_calls = 0

    async def counting_update(state: Any, *, client: Any) -> dict[str, Any]:
        nonlocal update_calls
        update_calls += 1
        return {}

    async def counting_synthesize(state: Any, *, llm: Any) -> dict[str, Any]:
        nonlocal synthesize_calls
        synthesize_calls += 1
        return {"result_summary": "ok"}

    criteria = [
        {"id": "c1", "requirement": "Has baseline"},
        {"id": "c2", "requirement": "Has pillars"},
        {"id": "c3", "requirement": "Has window"},
    ]
    initial = {
        "milestone_id": "ms-1",
        "location_id": 1,
        "user_id": "user-1",
        "goal": "Grow covers",
        "raw_data": '{"summary":"ok"}',
        "criteria": criteria,
        "evaluated": [],
        "result_summary": "",
        "result_node_id": None,
    }

    verdict = MagicMock()
    verdict.status = "pass"
    verdict.reasoning = "ok"

    with (
        patch(
            "agents_app.agents.core.milestone_eval.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_context",
            new=AsyncMock(
                return_value={
                    "goal": "Grow covers",
                    "raw_data": initial["raw_data"],
                    "criteria": criteria,
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.evaluate_criterion",
            new=AsyncMock(
                side_effect=lambda state, **_: {
                    "evaluated": [
                        {
                            "id": str(state.get("criterion_id", "")),
                            "requirement": str(state.get("requirement", "")),
                            "status": "pass",
                            "reasoning": "ok",
                        }
                    ]
                },
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.update_criteria",
            side_effect=counting_update,
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.synthesize",
            side_effect=counting_synthesize,
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.store_result",
            new=AsyncMock(return_value={"result_node_id": "result-1"}),
        ),
    ):
        graph = build_milestone_eval_graph(client, gateway_model_id="openai/gpt-4o-mini")
        await graph.ainvoke(initial)

    assert update_calls == 1, f"expected one update_criteria, got {update_calls}"
    assert synthesize_calls == 1, f"expected one synthesize, got {synthesize_calls}"
