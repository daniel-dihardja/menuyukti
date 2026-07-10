"""Tests for dedicated IGPlan graph path and output schema."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.ig_plan.nodes import (
    fetch_and_prepare,
    generate_plan_with_llm,
)
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
        "preset_id": "",
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
    }


def _slot_performance_fixture() -> dict:
    return {
        "sourceAnalyticsRunId": "42",
        "slots": [
            {
                "day": "monday",
                "mealPeriod": "lunch",
                "mealPeriodLabel": "Lunch",
                "mealPeriodHoursLabel": "11:00-14:00",
                "orderCount": 120,
                "demandIndex": 1.2,
                "relativeDemand": "high",
                "posture": "support",
            }
        ],
        "strongSlots": ["monday lunch"],
        "slotsNeedingPromotion": [],
        "summary": "Monday lunch is the strongest slot.",
    }


def _matrix_fixture() -> dict:
    return {
        "thresholds": {"avgPopularity": 0.5, "avgContributionMargin": 10.0},
        "distribution": [],
        "items": [
            {
                "menu": "Margherita Pizza",
                "category": "star",
                "action": "keep",
                "quantity": 100,
                "contributionMargin": 12.0,
                "weValue": 0.8,
            }
        ],
    }


def _slot_candidates_fixture() -> dict:
    return {
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "matrixAvailable": True,
        "coverageNotes": [],
        "slots": [
            {
                "day": "monday",
                "mealPeriod": "lunch",
                "mealPeriodLabel": "Lunch",
                "mealPeriodHoursLabel": "11:00-14:00",
                "orderCount": 120,
                "demandIndex": 1.2,
                "relativeDemand": "high",
                "posture": "support",
                "recommendedCategories": ["star", "plow_horse"],
                "totalItemQuantity": 400,
                "insufficientData": False,
                "candidates": [
                    {
                        "menu": "Margherita Pizza",
                        "globalCategory": "star",
                        "recommendedUse": "hero",
                        "rank": 1,
                        "score": 0.92,
                    }
                ],
            }
        ],
    }


def _valid_ig_plan_payload() -> dict:
    return {
        "planMarkdown": (
            "## Weekly cadence\n\n"
            "3 posts, 2 reels, 4 stories per week.\n\n"
            "## Weekly content plan\n\n"
            "| Day | Time | Format | Menu |\n"
            "| monday | 11:30 | reel | Margherita Pizza |\n"
        ),
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }


@pytest.mark.asyncio
async def test_routing_ig_plan_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_ig_plan_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": _valid_ig_plan_payload()["planMarkdown"],
                "milestone_data": _valid_ig_plan_payload(),
                "milestonedata_written": True,
            },
        )

    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_context",
            new=AsyncMock(
                return_value={
                    "goal": "G1",
                    "raw_data": "",
                    "criteria": [{"id": "c1", "requirement": "Must have entries"}],
                    "preset_id": "ig_plan",
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
                            {"id": "c1", "requirement": "Must have entries", "status": "open"}
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
        patch("agents_app.agents.core.milestone_run.graph.build_ig_plan_graph") as mock_build,
    ):
        mock_graph = MagicMock()
        mock_graph.astream = _fake_ig_plan_astream
        mock_build.return_value = mock_graph
        graph = build_milestone_run_graph(client)
        await graph.ainvoke(
            {
                **_minimal_initial(),
                "preset_id": "ig_plan",
                "milestone_id": "m-ig-plan",
            }
        )

    mock_build.assert_called_once()


def test_output_schema_valid_ig_plan_payload() -> None:
    normalized, error = validate_skill_output("ig_plan", _valid_ig_plan_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert "Weekly cadence" in normalized["planMarkdown"]


def test_output_schema_rejects_empty_plan_markdown() -> None:
    payload = _valid_ig_plan_payload()
    payload["planMarkdown"] = "   "
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_rejects_missing_reporting_period() -> None:
    payload = _valid_ig_plan_payload()
    payload["reportingPeriod"] = ""
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def _ig_plan_fetch_fixture() -> dict:
    return {
        "analyticsRunId": "42",
        "locationRaw": {
            "id": "1",
            "name": "Trattoria Roma",
            "street": "Via Roma 1",
            "city": "Milan",
            "country": "IT",
            "currency": "EUR",
            "manualBriefInput": {
                "locationId": 1,
                "quickProfile": {
                    "cuisineTypes": ["Italian"],
                    "tonePresets": ["warm", "inviting"],
                    "valueProposition": "Authentic Roman pasta in the city center.",
                },
            },
        },
        "slotPerformance": _slot_performance_fixture(),
        "menuEngineeringMatrix": _matrix_fixture(),
        "slotMenuCandidates": _slot_candidates_fixture(),
        "coverageNotes": [],
    }


@pytest.mark.asyncio
async def test_fetch_and_prepare_builds_generation_context() -> None:
    client = MagicMock(spec=AsyncMock)
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Weekly IG plan",
        "criteria": [],
        "milestone_input": {"type": "ig_plan", "value": {"notes": "focus lunch"}},
        "result_data": "",
        "milestonedata_written": False,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.fetch_ig_plan_inputs",
            new_callable=AsyncMock,
            return_value=_ig_plan_fetch_fixture(),
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=client)

    assert out["analytics_run_id"] == "42"
    context = str(out.get("generation_context_json") or "")
    assert "locationProfile" in context
    assert "Trattoria Roma" in context
    assert "Italian" in context
    assert "slotPerformance" in context
    assert "menuEngineeringMatrix" in context
    assert "slotMenuCandidates" in context
    assert "Margherita Pizza" in context
    assert "markdown" in context.lower()


@pytest.mark.asyncio
async def test_generate_plan_returns_markdown_payload() -> None:
    plan_markdown = (
        "## Weekly cadence\n\n"
        "3 posts, 2 reels, 4 stories.\n\n"
        "## Weekly content plan\n\n"
        "Monday 11:30 reel — Margherita Pizza"
    )
    state = {
        "slot_menu_candidates": _slot_candidates_fixture(),
        "analytics_run_id": "42",
        "generation_context_json": "{}",
        "result_data": "",
        "milestonedata_written": False,
    }

    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.astream_collect_from_run_config",
            new_callable=AsyncMock,
            return_value=plan_markdown,
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        out = await generate_plan_with_llm(state)  # type: ignore[arg-type]

    generated = out["generated_output"]
    assert generated["planMarkdown"] == plan_markdown
    assert generated["sourceAnalyticsRunId"] == "42"
    assert generated["reportingPeriod"] == "2025-01-01 to 2025-03-31"
