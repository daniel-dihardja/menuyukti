"""Tests for campaign-brief reflection config and loop nodes."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.campaign_brief.reflect import (
    QualityVerdict,
    reflect_critique,
    reflect_revise,
    route_after_generate,
    route_after_reflect,
)
from agents_app.agents.core.milestone_run.campaign_brief.reflect_config import (
    parse_reflection_config,
)


def _base_state(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Build campaign brief",
        "criteria": [{"id": "c1", "requirement": "Content pillars are substantive"}],
        "signal_markdown": "Signal context",
        "reflection_enabled": True,
        "reflection_max_revisions": 2,
        "reflection_iteration": 0,
        "reflection_critiques": [],
        "generated_output": {
            "venueSnapshot": {
                "venueName": "Cafe",
                "city": "Berlin",
                "country": "Germany",
                "currency": "EUR",
            },
            "contentPillars": ["Generic pillar"],
            "audienceHypotheses": ["Workers"],
            "proofOrientedAngles": ["Top sellers"],
            "toneGuardrails": ["Be concise"],
            "campaignObjective": "Increase lunch covers",
            "targetSegments": ["Office workers"],
            "messageHierarchy": ["Lead with lunch"],
            "offerAndCtaPlan": ["Book lunch"],
            "contentPillarPlan": ["Hero dish reels"],
            "measurementPlan": ["Track reservations"],
            "testingPlan": ["Test CTA copy"],
            "riskGuardrails": ["Avoid discount wars"],
        },
    }
    base.update(overrides)
    return base


def test_parse_reflection_config_defaults_when_missing() -> None:
    enabled, max_rev = parse_reflection_config(None)
    assert enabled is True
    assert max_rev == 2


def test_parse_reflection_config_reads_nested_values() -> None:
    enabled, max_rev = parse_reflection_config(
        {
            "type": "restaurant_campaign_brief",
            "value": {"notes": "", "reflection": {"enabled": False, "maxRevisions": 1}},
        }
    )
    assert enabled is False
    assert max_rev == 1


def test_route_after_generate_skips_when_disabled() -> None:
    assert route_after_generate(_base_state(reflection_enabled=False)) == "persist_result"


def test_route_after_generate_runs_reflect_when_enabled() -> None:
    assert route_after_generate(_base_state(reflection_enabled=True)) == "reflect_critique"


def test_route_after_reflect_persists_when_all_pass() -> None:
    state = _base_state(
        reflection_critiques=[
            {"id": "c1", "requirement": "R", "feedback": "ok", "quality_pass": True}
        ]
    )
    assert route_after_reflect(state) == "persist_result"


def test_route_after_reflect_loops_when_failures_remain() -> None:
    state = _base_state(
        reflection_critiques=[
            {"id": "c1", "requirement": "R", "feedback": "weak", "quality_pass": False}
        ],
        reflection_iteration=0,
        reflection_max_revisions=2,
    )
    assert route_after_reflect(state) == "reflect_critique"


def test_route_after_reflect_stops_at_max_revisions() -> None:
    state = _base_state(
        reflection_critiques=[
            {"id": "c1", "requirement": "R", "feedback": "weak", "quality_pass": False}
        ],
        reflection_iteration=2,
        reflection_max_revisions=2,
    )
    assert route_after_reflect(state) == "persist_result"


@pytest.mark.asyncio
async def test_reflect_critique_parallel_results() -> None:
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock(return_value=QualityVerdict(quality_pass=False, feedback="Too generic"))

    with (
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.reflect.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.reflect.structured_llm_from_milestone_run_config",
            return_value=mock_llm,
        ),
    ):
        out = await reflect_critique(_base_state())

    assert len(out["reflection_critiques"]) == 1
    assert out["reflection_critiques"][0]["quality_pass"] is False


@pytest.mark.asyncio
async def test_reflect_revise_keeps_draft_when_revision_invalid() -> None:
    mock_llm = MagicMock()
    mock_llm.with_structured_output.return_value = mock_llm
    mock_llm.ainvoke = AsyncMock(
        return_value=MagicMock(model_dump=lambda **_: {"campaignObjective": ""})
    )

    prior = _base_state(
        reflection_critiques=[
            {"id": "c1", "requirement": "R", "feedback": "weak", "quality_pass": False}
        ]
    )
    with (
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.reflect.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.campaign_brief.reflect.structured_llm_from_milestone_run_config",
            return_value=mock_llm,
        ),
    ):
        out = await reflect_revise(prior)

    assert out.get("generated_output") is None
    assert out["reflection_iteration"] == 1
