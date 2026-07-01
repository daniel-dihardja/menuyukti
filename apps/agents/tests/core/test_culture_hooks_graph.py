"""Tests for dedicated culture-hooks graph path and output schema."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.culture_hooks.nodes import (
    _culture_hooks_search_queries,
    fetch_and_prepare,
    generate_intersections,
    research_local_culture,
)
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
        "preset_id": "",
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
    }


def _valid_culture_hooks_payload() -> dict:
    return {
        "locationConcept": "Retro-inspired peranakan heritage with intergenerational values.",
        "targetAudience": "Urban professionals and young families who value nostalgic lifestyle cues.",
        "intersections": [
            {
                "topic": "Bring-your-own container habits",
                "conceptLink": "Links retro practices with modern sustainability.",
                "audienceRelevance": "Audience wants practical eco habits that feel authentic.",
                "contentExample": "Carousel with old-vs-new takeaway rituals and simple reusable tips.",
            },
            {
                "topic": "Heirloom home routines",
                "conceptLink": "Connects heritage concept with family traditions.",
                "audienceRelevance": "Young families look for meaningful traditions to revive.",
                "contentExample": "Reel on one old-school family routine adapted for modern life.",
            },
            {
                "topic": "Community repair mindset",
                "conceptLink": "Retro spirit values care, repair, and longevity.",
                "audienceRelevance": "Urban audiences are interested in low-waste living.",
                "contentExample": "Single post featuring a weekly small repair challenge with community tag.",
            },
        ],
        "guardrailCheck": "All intersections are non-food and grounded in campaign brief signals.",
    }


@pytest.mark.asyncio
async def test_routing_culture_hooks_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_culture_hooks_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"locationConcept":"x"}',
                "milestone_data": _valid_culture_hooks_payload(),
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
                    "criteria": [{"id": "c1", "requirement": "Must have intersections"}],
                    "preset_id": "culture_hooks",
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
                            {"id": "c1", "requirement": "Must have intersections", "status": "open"}
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
        patch("agents_app.agents.core.milestone_run.graph.build_culture_hooks_graph") as mock_build,
    ):
        mock_graph = MagicMock()
        mock_graph.astream = _fake_culture_hooks_astream
        mock_build.return_value = mock_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_build.assert_called_once()
    assert out.get("milestonedata_written") is True


def test_output_schema_valid_culture_hooks_payload() -> None:
    normalized, error = validate_skill_output("culture_hooks", _valid_culture_hooks_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["intersections"]) == 3


def test_output_schema_rejects_invalid_intersections_count() -> None:
    payload = _valid_culture_hooks_payload()
    payload["intersections"] = payload["intersections"][:2]
    normalized, error = validate_skill_output("culture_hooks", payload)
    assert normalized is None
    assert error is not None


@pytest.mark.asyncio
async def test_generate_intersections_returns_new_shape() -> None:
    state = {
        "goal": "Find concept/audience intersections",
        "criteria": [],
        "generation_context_markdown": "Context from campaign brief",
    }
    draft = MagicMock()
    draft.model_dump = MagicMock(return_value=_valid_culture_hooks_payload())
    with (
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=draft),
        ),
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await generate_intersections(state)  # type: ignore[arg-type]
    assert out["generated_output"]["locationConcept"]
    assert len(out["generated_output"]["intersections"]) == 3


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_prior_campaign_brief() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Find intersections",
        "criteria": [],
        "injected_prior_context_markdown": "",
        "milestone_input": {"type": "culture_hooks", "value": {"notes": ""}},
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(
            ValueError, match="culture_hooks requires a prior restaurant_campaign_brief milestone"
        ),
    ):
        await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))


def _sample_campaign_brief() -> dict:
    return {
        "venueSnapshot": {"venueName": "Cafe Retro", "city": "Amsterdam", "country": "Netherlands"},
        "overallStrategy": {
            "strategyFocus": "Heritage brunch culture",
            "audiencePriority": ["Young creatives"],
            "coreMessage": "Nostalgic warmth",
            "offerWindow": "Weekends",
            "cadenceGuidance": ["Post twice weekly"],
        },
        "contentPillars": ["Heritage"],
        "audienceHypotheses": ["Weekend social groups"],
        "proofOrientedAngles": ["Family recipes"],
        "toneGuardrails": ["Warm and nostalgic"],
        "campaignObjective": "Grow weekend covers",
        "mainCategory": "Brunch",
        "targetSegments": ["Young creatives"],
        "messageHierarchy": ["Heritage brunch rituals"],
        "offerAndCtaPlan": ["Reserve a table"],
        "contentPillarPlan": ["Heritage stories"],
        "measurementPlan": ["Track reservations"],
        "testingPlan": ["Test hooks"],
        "riskGuardrails": ["No alcohol focus"],
    }


def test_culture_hooks_search_queries_from_brief() -> None:
    queries = _culture_hooks_search_queries(_sample_campaign_brief())
    assert len(queries) == 2
    assert "Amsterdam" in queries[0]
    assert "Heritage brunch culture" in queries[1] or "Heritage brunch rituals" in queries[1]


@pytest.mark.asyncio
async def test_research_local_culture_skips_without_tavily() -> None:
    prior = json.dumps(
        [
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": _sample_campaign_brief(),
            }
        ]
    )
    state = {
        "prior_milestones_data": prior,
        "generation_context_markdown": "base context",
        "owner_notes_markdown": "",
        "goal": "G",
        "criteria": [],
        "injected_prior_context_markdown": "brief",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.make_search_web_tool",
            return_value=None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await research_local_culture(state)  # type: ignore[arg-type]
    assert out == {"web_research_markdown": ""}


@pytest.mark.asyncio
async def test_research_local_culture_appends_results_when_tavily_available() -> None:
    prior = json.dumps(
        [
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": _sample_campaign_brief(),
            }
        ]
    )
    state = {
        "prior_milestones_data": prior,
        "generation_context_markdown": "## Milestone goal\nG",
        "owner_notes_markdown": "",
        "goal": "G",
        "criteria": [],
        "injected_prior_context_markdown": "brief",
    }
    mock_tool = MagicMock()
    mock_tool.ainvoke = AsyncMock(return_value="Local art scene snippet")
    with (
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.make_search_web_tool",
            return_value=mock_tool,
        ),
        patch(
            "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await research_local_culture(state)  # type: ignore[arg-type]

    assert "Local culture web research" in out["web_research_markdown"]
    assert "Local art scene snippet" in out["generation_context_markdown"]
    assert mock_tool.ainvoke.await_count >= 1
