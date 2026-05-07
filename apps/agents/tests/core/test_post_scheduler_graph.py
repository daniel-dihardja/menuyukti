"""Tests for dedicated post-scheduler graph path and output schema."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_scheduler.nodes import (
    _extract_allowed_menu_names,
    fetch_and_prepare,
    persist_result,
)


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


def _valid_post_scheduler_payload() -> dict:
    return {
        "posts": [
            {
                "dayOfWeek": "Monday",
                "date": "2026-06-01",
                "time": "12:30",
                "postType": "Reel",
                "contentType": "Carousel",
                "promotedMenuItems": ["Nasi Goreng", "Truffle Pasta"],
                "captionIdea": "Lunch-time hero pairings for office crowd.",
            },
            {
                "dayOfWeek": "Thursday",
                "date": "2026-06-04",
                "time": "18:30",
                "postType": "Post",
                "contentType": "Single",
                "promotedMenuItems": ["Sate Ayam"],
                "captionIdea": "Dinner comfort special with grilled highlights.",
            },
        ]
    }


@pytest.mark.asyncio
async def test_routing_post_scheduler_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_post_scheduler_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"posts":[{"dayOfWeek":"Monday","date":"2026-06-01","time":"12:30","postType":"Reel","contentType":"Carousel","promotedMenuItems":["Nasi Goreng"],"captionIdea":"Lunch hero."}]}',
                "milestone_data": {
                    "posts": [
                        {
                            "dayOfWeek": "Monday",
                            "date": "2026-06-01",
                            "time": "12:30",
                            "postType": "Reel",
                            "contentType": "Carousel",
                            "promotedMenuItems": ["Nasi Goreng"],
                            "captionIdea": "Lunch hero.",
                        }
                    ]
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
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(return_value={"data": {"presetId": "post_scheduler"}}),
        ),
        patch("agents_app.agents.core.milestone_eval.nodes.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch("agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph", return_value=mock_eval),
        patch("agents_app.agents.core.milestone_run.graph.build_post_scheduler_graph") as mock_build_post,
    ):
        mock_post_graph = MagicMock()
        mock_post_graph.astream = _fake_post_scheduler_astream
        mock_build_post.return_value = mock_post_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_build_post.assert_called_once()
    assert out.get("milestonedata_written") is True


def test_output_schema_valid_post_scheduler_payload() -> None:
    normalized, error = validate_skill_output("post_scheduler", _valid_post_scheduler_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["posts"]) == 2


def test_output_schema_rejects_empty_promoted_menu_items() -> None:
    payload = {
        "posts": [
            {
                "dayOfWeek": "Monday",
                "date": "2026-06-01",
                "time": "12:30",
                "postType": "Reel",
                "contentType": "Carousel",
                "promotedMenuItems": [],
                "captionIdea": "Lunch hero.",
            }
        ]
    }
    normalized, error = validate_skill_output("post_scheduler", payload)
    assert normalized is None
    assert error is not None


@pytest.mark.asyncio
async def test_fetch_and_prepare_handles_scheduler_plan_graphql_error() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "workflow_id": "wf-1",
        "goal": "Build post schedule",
        "criteria": [],
        "milestone_input": None,
        "injected_prior_context_markdown": "",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.post_scheduler.nodes.fetch_campaign_schedule_plan",
            new=AsyncMock(
                side_effect=RuntimeError(
                    "'NoneType' object has no attribute 'get'; path=['campaignSchedulePlan']; code=INTERNAL_SERVER_ERROR"
                )
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.post_scheduler.nodes.fetch_promotion_engineering_candidates",
            new=AsyncMock(return_value=None),
        ),
        patch(
            "agents_app.agents.core.milestone_run.post_scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))
    assert out["scheduler_plan"] is None
    assert "Scheduler plan unavailable" in out["generation_context_markdown"]


@pytest.mark.asyncio
async def test_persist_result_filters_menu_items_to_prefetched_promotion_candidates() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": {
            "posts": [
                {
                    "dayOfWeek": "Monday",
                    "date": "2026-06-01",
                    "time": "12:30",
                    "postType": "Reel",
                    "contentType": "Carousel",
                    "promotedMenuItems": ["Invented Dish"],
                    "captionIdea": "Lunch hero.",
                },
                {
                    "dayOfWeek": "Thursday",
                    "date": "2026-06-04",
                    "time": "18:30",
                    "postType": "Post",
                    "contentType": "Single",
                    "promotedMenuItems": ["Nasi Goreng", "Invented Dish"],
                    "captionIdea": "Dinner comfort.",
                },
            ]
        },
        "promotion_candidates": {
            "grouping": "flat",
            "starItems": ["Nasi Goreng"],
            "puzzleItems": ["Sate Ayam"],
        },
    }
    with patch(
        "agents_app.agents.core.milestone_run.post_scheduler.nodes.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-1"}),
    ) as mock_upsert:
        out = await persist_result(state, client=MagicMock(spec=AsyncMock))

    assert "Nasi Goreng" in out["result_data"]
    saved_payload = mock_upsert.await_args.args[2]
    assert saved_payload["posts"][0]["promotedMenuItems"] == ["Nasi Goreng"]
    assert saved_payload["posts"][1]["promotedMenuItems"] == ["Nasi Goreng"]


def test_extract_allowed_menu_names_uses_prefetched_menu_lists_only() -> None:
    state = {
        "promotion_candidates": {
            "grouping": "flat",
            "starItems": ["Nasi Goreng", "Teh Tarik"],
            "puzzleItems": ["Promote AIR MINERAL during lunch hours for office workers."],
        }
    }
    names = _extract_allowed_menu_names(state)  # type: ignore[arg-type]
    assert "Nasi Goreng" in names
    assert "Teh Tarik" in names
    assert "Promote AIR MINERAL during lunch hours for office workers." not in names
