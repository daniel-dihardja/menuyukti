"""Tests for milestone run dedicated preset dispatch."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph


async def _fake_eval_astream(*_a: object, **_k: object):
    yield (
        "values",
        {
            "evaluated": [{"id": "c1", "status": "pass"}],
            "result_summary": "S1",
            "result_node_id": "rn1",
        },
    )


def _minimal_initial() -> dict:
    return {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "workflow_id": None,
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "prior_milestones_data": "",
        "preset_id": "",
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
    }


def test_build_milestone_run_graph_compiles() -> None:
    client = MagicMock(spec=AsyncMock)
    graph = build_milestone_run_graph(client)
    assert graph is not None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("preset_id", "build_symbol"),
    [
        ("restaurant_campaign_brief", "build_campaign_brief_graph"),
        ("dates", "build_dates_graph"),
        ("promotion_candidates", "build_promotion_candidates_graph"),
        ("menu_tagger", "build_menu_tagger_graph"),
        ("reel_lineup", "build_reel_lineup_graph"),
        ("post_lineup", "build_post_lineup_graph"),
        ("culture_hooks", "build_culture_hooks_graph"),
        ("ig_profile", "build_ig_profile_graph"),
    ],
)
async def test_graph_dispatches_to_dedicated_preset_graph(
    preset_id: str, build_symbol: str
) -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_subgraph_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"ok":true}',
                "milestone_data": {"ok": True},
                "milestonedata_written": True,
            },
        )

    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "presetId": preset_id,
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have data", "status": "open"}
                        ],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have data", "status": "open"}
                        ],
                    }
                }
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
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch(
            "agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph",
            return_value=mock_eval,
        ),
        patch(f"agents_app.agents.core.milestone_run.graph.{build_symbol}") as mock_build_graph,
    ):
        mock_graph = MagicMock()
        mock_graph.astream = _fake_subgraph_astream
        mock_build_graph.return_value = mock_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_build_graph.assert_called_once()
    assert out.get("result_summary") == "S1"
    assert out.get("result_node_id") == "rn1"
    assert out.get("last_criteria_verdicts") == [{"id": "c1", "status": "pass"}]


@pytest.mark.asyncio
async def test_fetch_children_uses_row_first_pass_criterias() -> None:
    """Regression: row-level passCriterias must not be wiped by legacy data-only parsing."""
    from agents_app.agents.core.milestone_run.graph import _fetch_children

    client = MagicMock(spec=AsyncMock)
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "workflow_id": None,
        "milestone_input": None,
        "request_goal": None,
    }
    row_level_criteria = [
        {"id": "c1", "requirement": "Campaign objective names dual outcomes", "status": "open"},
        {"id": "c2", "requirement": "Content pillars are listed", "status": "open"},
    ]
    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_context",
            new=AsyncMock(
                return_value={
                    "goal": "G1",
                    "raw_data": "",
                    "criteria": [
                        {"id": "c1", "requirement": "Campaign objective names dual outcomes"},
                        {"id": "c2", "requirement": "Content pillars are listed"},
                    ],
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "passCriterias": row_level_criteria,
                    "data": {"presetId": "restaurant_campaign_brief"},
                }
            ),
        ),
    ):
        out = await _fetch_children(state, client=client)  # type: ignore[arg-type]

    assert out["criteria"] == [
        {"id": "c1", "requirement": "Campaign objective names dual outcomes"},
        {"id": "c2", "requirement": "Content pillars are listed"},
    ]
    assert out["preset_id"] == "restaurant_campaign_brief"


@pytest.mark.asyncio
async def test_graph_raises_for_unknown_preset() -> None:
    client = MagicMock(spec=AsyncMock)
    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "presetId": "unknown_preset",
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have data", "status": "open"}
                        ],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have data", "status": "open"}
                        ],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        graph = build_milestone_run_graph(client)
        with pytest.raises(RuntimeError, match="Unsupported milestone preset"):
            await graph.ainvoke(_minimal_initial())
