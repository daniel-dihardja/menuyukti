"""Tests for format-mix graph and prior campaign-brief extraction."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.format_mix.nodes import (
    fetch_campaign_brief_context,
    persist_stub,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_restaurant_campaign_brief_data,
)


def _minimal_brief_data() -> dict:
    return {
        "venueSnapshot": {"venueName": "Cafe", "city": "X", "country": "Y", "currency": "USD"},
        "contentPillars": ["p1"],
        "audienceHypotheses": ["a1"],
        "proofOrientedAngles": [],
        "toneGuardrails": [],
        "campaignObjective": "Grow lunch traffic",
        "mainCategory": "FOOD",
        "targetSegments": [],
        "messageHierarchy": [],
        "offerAndCtaPlan": [],
        "contentPillarPlan": [],
        "measurementPlan": [],
        "testingPlan": [],
        "riskGuardrails": [],
    }


def test_extract_restaurant_campaign_brief_data_empty() -> None:
    assert extract_restaurant_campaign_brief_data("") is None
    assert extract_restaurant_campaign_brief_data("not-json") is None


def test_extract_restaurant_campaign_brief_data_by_preset_id() -> None:
    brief = _minimal_brief_data()
    prior = json.dumps(
        [
            {
                "title": "Brief",
                "presetId": "restaurant_campaign_brief",
                "data": brief,
            }
        ]
    )
    got = extract_restaurant_campaign_brief_data(prior)
    assert got == brief


def test_extract_restaurant_campaign_brief_data_shape_fallback() -> None:
    brief = _minimal_brief_data()
    prior = json.dumps(
        [
            {
                "title": "Brief",
                "presetId": "custom",
                "data": brief,
            }
        ]
    )
    got = extract_restaurant_campaign_brief_data(prior)
    assert got == brief


@pytest.mark.asyncio
async def test_fetch_campaign_brief_context_errors_without_brief() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "prior_milestones_data": "[]",
        "result_data": "",
        "milestonedata_written": False,
    }
    client = MagicMock(spec=AsyncMock)
    with (
        patch(
            "agents_app.agents.core.milestone_run.format_mix.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="format_mix requires a prior"),
    ):
        await fetch_campaign_brief_context(state, client=client)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_fetch_campaign_brief_context_loads_brief() -> None:
    brief = _minimal_brief_data()
    prior = json.dumps(
        [{"title": "B", "presetId": "restaurant_campaign_brief", "data": brief}]
    )
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "g",
        "criteria": [],
        "prior_milestones_data": prior,
        "result_data": "",
        "milestonedata_written": False,
    }
    client = MagicMock(spec=AsyncMock)
    with patch(
        "agents_app.agents.core.milestone_run.format_mix.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        out = await fetch_campaign_brief_context(state, client=client)  # type: ignore[arg-type]
    assert out["campaign_brief_data"] == brief
    assert "Prior milestone context" in str(out.get("injected_prior_context_markdown", ""))


@pytest.mark.asyncio
async def test_persist_stub_writes_empty_formats() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "result_data": "",
        "milestonedata_written": False,
    }
    client = MagicMock(spec=AsyncMock)
    with patch(
        "agents_app.agents.core.milestone_run.format_mix.nodes.upsert_milestonedata_node",
        new_callable=AsyncMock,
    ) as mock_upsert:
        out = await persist_stub(state, client=client)  # type: ignore[arg-type]
    mock_upsert.assert_awaited_once()
    assert out["milestonedata_written"] is True
    assert out["milestone_data"] == {"formats": []}
    normalized, err = validate_skill_output("format_mix", json.loads(out["result_data"]))
    assert err is None
    assert normalized == {"formats": []}
