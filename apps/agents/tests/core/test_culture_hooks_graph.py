"""Tests for dedicated culture-hooks graph path and output schema."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.culture_hooks.nodes import (
    fetch_and_prepare,
    generate_intersections,
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
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_children",
            new=AsyncMock(return_value=[{"nodeType": "goal", "data": {"goal": "G1"}}]),
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "presetId": "culture_hooks",
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have intersections", "status": "open"}
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
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have intersections", "status": "open"}
                        ]
                    }
                }
            ),
        ),
        patch("agents_app.agents.core.milestone_eval.nodes.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch("agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph", return_value=mock_eval),
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
    with patch(
        "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_llm_structured",
    ) as mock_get_llm, patch(
        "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        mock_llm = MagicMock()
        mock_structured = MagicMock()
        mock_structured.ainvoke = AsyncMock(
            return_value=MagicMock(model_dump=MagicMock(return_value=_valid_culture_hooks_payload()))
        )
        mock_llm.with_structured_output.return_value = mock_structured
        mock_get_llm.return_value = mock_llm
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
    with patch(
        "agents_app.agents.core.milestone_run.culture_hooks.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        with pytest.raises(
            ValueError, match="culture_hooks requires a prior restaurant_campaign_brief milestone"
        ):
            await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))
