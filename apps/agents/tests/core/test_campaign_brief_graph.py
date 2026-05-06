"""Tests for dedicated campaign-brief graph path and guardrails."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.campaign_brief.nodes import fetch_and_prepare
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.skills import SKILL_REGISTRY
from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools
from langchain_core.tools import BaseTool


async def _empty_astream_events(*_a: object, **_k: object):
    if False:  # pragma: no cover
        yield None


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


def _valid_campaign_brief_payload() -> dict:
    return {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [
            {
                "name": "Tag der Deutschen Einheit",
                "description": "National holiday",
                "date": "2026-06-03",
            }
        ],
        "venueSnapshot": {
            "venueName": "Cafe Alto",
            "city": "Berlin",
            "country": "Germany",
            "currency": "EUR",
        },
        "contentPillars": ["Hero signatures", "Category variety", "Behind-the-scenes craft"],
        "audienceHypotheses": ["Lunch nearby workers", "Weekend family groups", "Evening social dining"],
        "proofOrientedAngles": [
            "Top sellers lead conversions",
            "Weekend mix supports bundles",
            "Meal-period demand shapes timing",
        ],
        "toneGuardrails": ["Be specific", "Keep copy concise", "Use operational language"],
    }


@pytest.mark.asyncio
async def test_routing_campaign_brief_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_campaign_brief_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"venueSnapshot":{"venueName":"Cafe Alto","city":"Berlin","country":"Germany","currency":"EUR"},"contentPillars":["A","B","C"],"audienceHypotheses":["A","B","C"],"proofOrientedAngles":["A","B","C"],"toneGuardrails":["A","B","C"]}',
                "milestone_data": {
                    "venueSnapshot": {
                        "venueName": "Cafe Alto",
                        "city": "Berlin",
                        "country": "Germany",
                        "currency": "EUR",
                    },
                    "contentPillars": ["A", "B", "C"],
                    "audienceHypotheses": ["A", "B", "C"],
                    "proofOrientedAngles": ["A", "B", "C"],
                    "toneGuardrails": ["A", "B", "C"],
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
                        "milestoneRunSkillIds": ["campaign_brief"],
                    }
                }
            ),
        ),
        patch("agents_app.agents.core.milestone_eval.nodes.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch("agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph", return_value=mock_eval),
        patch("agents_app.agents.core.milestone_run.graph.create_react_agent") as mock_react,
        patch("agents_app.agents.core.milestone_run.graph.build_campaign_brief_graph") as mock_build_brand,
    ):
        mock_brand_graph = MagicMock()
        mock_brand_graph.astream = _fake_campaign_brief_astream
        mock_build_brand.return_value = mock_brand_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_react.assert_not_called()
    mock_build_brand.assert_called_once()
    assert out.get("milestonedata_written") is True


@pytest.mark.asyncio
async def test_routing_non_campaign_brief_stays_dynamic_react() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

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
                        "milestoneRunSkillIds": ["public_holidays"],
                    }
                }
            ),
        ),
        patch("agents_app.agents.core.milestone_eval.nodes.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch("agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph", return_value=mock_eval),
        patch("agents_app.agents.core.milestone_run.graph.build_campaign_brief_graph") as mock_build_brand,
        patch("agents_app.agents.core.milestone_run.graph.get_llm_structured", return_value=MagicMock()),
        patch("agents_app.agents.core.milestone_run.graph.create_react_agent") as mock_react,
    ):
        mock_agent = MagicMock()
        mock_agent.astream_events = MagicMock(side_effect=_empty_astream_events)
        mock_react.return_value = mock_agent
        graph = build_milestone_run_graph(client)
        await graph.ainvoke(_minimal_initial())

    mock_build_brand.assert_not_called()
    mock_react.assert_called_once()


def test_output_schema_required_keys_and_types() -> None:
    normalized, error = validate_skill_output("campaign_brief", _valid_campaign_brief_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert isinstance(normalized["venueSnapshot"], dict)
    assert isinstance(normalized["contentPillars"], list)
    assert isinstance(normalized["audienceHypotheses"], list)
    assert isinstance(normalized["proofOrientedAngles"], list)
    assert isinstance(normalized["toneGuardrails"], list)


def test_guardrails_block_campaign_date_text_in_venue_identity() -> None:
    payload = _valid_campaign_brief_payload()
    payload["venueSnapshot"]["venueName"] = "Cafe Alto campaign start date 2026-06-01"
    normalized, error = validate_skill_output("campaign_brief", payload)
    assert normalized is None
    assert error is not None


def test_guardrails_enforce_uniqueness_and_minmax_counts() -> None:
    payload = _valid_campaign_brief_payload()
    payload["contentPillars"] = ["Hero signatures", "hero signatures", "Hero signatures"]
    normalized, error = validate_skill_output("campaign_brief", payload)
    assert normalized is None
    assert error is not None
    assert "between 3 and 5 unique non-empty items" in error


@pytest.mark.asyncio
async def test_fallback_when_analytics_missing_still_builds_context() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Build campaign brief",
        "criteria": [],
        "milestone_input": {
            "type": "restaurant_campaign_brief",
            "value": {"notes": "brunch focus", "startDate": "2026-06-01", "endDate": "2026-06-30"},
        },
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.nodes.graphql_post",
            new=AsyncMock(
                return_value={
                    "location": {
                        "name": "Cafe Alto",
                        "city": "Berlin",
                        "country": "Germany",
                        "currency": "EUR",
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.nodes.fetch_location_operating_signals",
            new=AsyncMock(return_value={"analytics_run": None, "instagram_signals": None}),
        ),
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.nodes.fetch_public_holidays_for_milestone",
            new=AsyncMock(return_value=([], None)),
        ),
        patch("agents_app.agents.core.milestone_run.campaign_brief.nodes.get_stream_writer", return_value=lambda _x: None),
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))
    assert "signal_markdown" in out
    assert "operating signals unavailable" in out["signal_markdown"].lower()


def test_backward_compat_skill_registry_and_tool_assembly() -> None:
    assert "campaign_brief" in SKILL_REGISTRY
    tools = make_milestone_run_tools(
        context={"goal": "g", "criteria": [], "result_data": "", "prior_milestones_data": ""},
        milestone_id="m1",
        location_id=1,
        user_id="u1",
        client=MagicMock(spec=AsyncMock),
    )
    assert isinstance(tools, list)
    assert all(isinstance(t, BaseTool) for t in tools)
