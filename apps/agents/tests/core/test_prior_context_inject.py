"""Tests for prior milestone context injection into milestone-run prompts."""

from __future__ import annotations

import json

from agents_app.agents.core.milestone_run.prior_context_inject import (
    build_injected_prior_context_markdown,
)


def test_build_injected_prior_empty_config() -> None:
    md, matched = build_injected_prior_context_markdown('[{"title":"A","data":{}}]', ())
    assert md == ""
    assert matched == []


def test_build_injected_prior_invalid_json() -> None:
    md, matched = build_injected_prior_context_markdown("not-json", ("restaurant_campaign_brief",))
    assert md == ""
    assert matched == []


def test_build_injected_prior_matches_preset_id() -> None:
    rows = [
        {
            "title": "Brief",
            "presetId": "restaurant_campaign_brief",
            "data": {"x": 1},
        }
    ]
    md, matched = build_injected_prior_context_markdown(
        json.dumps(rows),
        ("restaurant_campaign_brief",),
    )
    assert "Prior milestone context (injected)" in md
    assert "Brief" in md
    assert matched == ["restaurant_campaign_brief"]


def test_build_injected_prior_campaign_brief_shape_fallback() -> None:
    rows = [
        {
            "title": "Legacy brief",
            "presetId": None,
            "data": {
                "venueSnapshot": {"venueName": "V", "city": "C", "country": "K", "currency": "EUR"},
                "contentPillars": [],
                "audienceHypotheses": [],
                "proofOrientedAngles": [],
                "toneGuardrails": [],
            },
        }
    ]
    md, matched = build_injected_prior_context_markdown(
        json.dumps(rows),
        ("restaurant_campaign_brief",),
    )
    assert "Legacy brief" in md
    assert matched == ["restaurant_campaign_brief"]


def test_build_injected_prior_no_match() -> None:
    rows = [{"title": "Other", "presetId": "dates", "data": {"startDate": "2025-01-01"}}]
    md, matched = build_injected_prior_context_markdown(
        json.dumps(rows),
        ("restaurant_campaign_brief",),
    )
    assert md == ""
    assert matched == []
