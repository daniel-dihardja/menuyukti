"""Tests for dedicated promotion-candidates graph path and output schema."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output


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
        "api_adapter_tools": [],
        "selected_skill_id": None,
        "selected_skill_ids": [],
        "current_skill_index": 0,
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
    }


def _valid_promotion_candidates_payload() -> dict:
    return {
        "grouping": "by_menu_category",
        "categories": {
            "Mains": {
                "menuCategory": "Mains",
                "starHighlights": ["Nasi Goreng drives high volume and margin."],
                "puzzleHighlights": ["Truffle Pasta has high margin but low volume."],
                "notes": "Push puzzle with a limited-time visual hook.",
            }
        },
        "flatSummary": "",
        "promotionIdeas": [
            "Feature Nasi Goreng in weekday lunch reels to maximize conversion.",
            "Pair Truffle Pasta with social-proof captions to lift trial.",
        ],
    }


@pytest.mark.asyncio
async def test_routing_promotion_candidates_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_promotion_candidates_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"grouping":"flat","categories":{},"flatSummary":"No analytics run found.","promotionIdeas":[]}',
                "milestone_data": {
                    "grouping": "flat",
                    "categories": {},
                    "flatSummary": "No analytics run found.",
                    "promotionIdeas": [],
                },
                "milestonedata_written": True,
            },
        )

    with (
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_children",
            new=AsyncMock(return_value=[{"nodeType": "goal", "data": {"goal": "G1"}}]),
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_api_adapter_tools_for_location",
            new=AsyncMock(return_value=[]),
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "milestoneRunSkillMode": "fixed",
                        "milestoneRunSkillIds": ["promotion_candidates"],
                    }
                }
            ),
        ),
        patch("agents_app.agents.core.milestone_eval.nodes.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch("agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph", return_value=mock_eval),
        patch("agents_app.agents.core.milestone_run.graph.create_react_agent") as mock_react,
        patch(
            "agents_app.agents.core.milestone_run.graph.build_promotion_candidates_graph"
        ) as mock_build_promotion,
    ):
        mock_promotion_graph = MagicMock()
        mock_promotion_graph.astream = _fake_promotion_candidates_astream
        mock_build_promotion.return_value = mock_promotion_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_react.assert_not_called()
    mock_build_promotion.assert_called_once()
    assert out.get("milestonedata_written") is True


def test_output_schema_valid_promotion_candidates_payload() -> None:
    normalized, error = validate_skill_output(
        "promotion_candidates", _valid_promotion_candidates_payload()
    )
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["grouping"] == "by_menu_category"
    assert "Mains" in normalized["categories"]


def test_output_schema_rejects_flat_with_categories() -> None:
    payload = {
        "grouping": "flat",
        "categories": {"Mains": {"menuCategory": "Mains", "starHighlights": [], "puzzleHighlights": []}},
        "flatSummary": "Fallback summary",
        "promotionIdeas": [],
    }
    normalized, error = validate_skill_output("promotion_candidates", payload)
    assert normalized is None
    assert error is not None
