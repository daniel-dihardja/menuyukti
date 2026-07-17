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
        "locationConcept": (
            "Italian trattoria concept rooted in regional Italian heritage, "
            "serving guests in a German city with a warm neighbourhood atmosphere."
        ),
        "targetAudience": (
            "Urban professionals and couples in Germany who enjoy travel culture "
            "and Mediterranean lifestyle aesthetics beyond food alone."
        ),
        "intersections": [
            {
                "topic": "Tuscany hill towns",
                "conceptLink": "Links the restaurant's Italian origin story to iconic regional landscapes.",
                "audienceRelevance": "German audiences often associate Tuscany with aspirational travel and weekend escapes.",
                "contentExample": "Reel opening on a hill-town skyline with soft ambient sound, inviting save-for-later travel mood.",
            },
            {
                "topic": "Amalfi coastal culture",
                "conceptLink": "Connects coastal Italian identity to the venue's leisurely hospitality vibe.",
                "audienceRelevance": "Local diners follow Mediterranean travel content and coastal lifestyle imagery.",
                "contentExample": "Carousel of Amalfi cliff walks and colour palettes with a Story sticker for dream destinations.",
            },
            {
                "topic": "Roman neighbourhood rituals",
                "conceptLink": "Grounds the concept in everyday Roman street life rather than tourist clichés.",
                "audienceRelevance": "City audiences relate to neighbourhood routines and slow evening walks.",
                "contentExample": "Feed post about evening passeggiata culture with a short caption inviting comments on favourite streets.",
            },
        ],
        "guardrailCheck": "All intersections are non-food heritage/place topics grounded in campaign brief signals.",
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
        "venueSnapshot": {"venueName": "Trattoria Verde", "city": "Munich", "country": "Germany"},
        "overallStrategy": {
            "strategyFocus": "Italian neighbourhood hospitality",
            "audiencePriority": ["Urban professionals"],
            "coreMessage": "A slice of Italy in the city",
            "offerWindow": "Weekends",
            "cadenceGuidance": ["Post twice weekly"],
        },
        "contentPillars": ["Italian heritage"],
        "audienceHypotheses": ["Weekend social groups"],
        "proofOrientedAngles": ["Family roots in Italy"],
        "toneGuardrails": ["Warm and welcoming"],
        "campaignObjective": "Grow weekend covers",
        "mainCategory": "Italian",
        "targetSegments": ["Urban professionals"],
        "messageHierarchy": ["Authentic Italian neighbourhood feel"],
        "offerAndCtaPlan": ["Reserve a table"],
        "contentPillarPlan": ["Heritage stories"],
        "measurementPlan": ["Track reservations"],
        "testingPlan": ["Test hooks"],
        "riskGuardrails": ["No alcohol focus"],
    }


def test_culture_hooks_search_queries_from_brief() -> None:
    queries = _culture_hooks_search_queries(_sample_campaign_brief())
    assert len(queries) == 2
    assert "Italian places landmarks culture popular with people in Germany" == queries[0]
    assert "Italian travel culture Instagram Munich Germany" == queries[1]


def test_culture_hooks_search_queries_fallback_without_origin() -> None:
    brief = {
        "venueSnapshot": {"venueName": "Cafe Local", "city": "Amsterdam", "country": "Netherlands"},
        "mainCategory": "",
        "messageHierarchy": [],
        "proofOrientedAngles": [],
        "contentPillars": [],
        "overallStrategy": {
            "strategyFocus": "",
            "audiencePriority": [],
            "coreMessage": "",
            "offerWindow": "",
            "cadenceGuidance": [],
        },
    }
    queries = _culture_hooks_search_queries(brief)
    assert len(queries) == 2
    assert "lifestyle subcultures Amsterdam Netherlands Instagram" == queries[0]
    assert "creative class interests Amsterdam Netherlands" == queries[1]


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

    assert "Heritage and audience culture web research" in out["web_research_markdown"]
    assert "Local art scene snippet" in out["generation_context_markdown"]
    assert mock_tool.ainvoke.await_count >= 1
