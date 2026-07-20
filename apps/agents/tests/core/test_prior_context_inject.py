"""Tests for prior milestone context injection into milestone-run prompts."""

from __future__ import annotations

import json

from agents_app.agents.core.milestone_run.prior_context_inject import (
    build_injected_prior_context_markdown,
    extract_menu_tagger_data,
    extract_promotion_candidates_data,
    extract_promotion_candidates_row,
    extract_restaurant_campaign_brief_row,
    preferred_milestone_id_from_input,
    promotion_candidates_prior_error_message,
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


def test_build_injected_prior_promotion_candidates_shape_fallback() -> None:
    rows = [
        {
            "title": "Promotion picks",
            "presetId": None,
            "data": {
                "mainCategory": "Mains",
                "categories": [
                    {
                        "category": "Mains",
                        "starItems": [{"name": "Steak", "popularity": 0.4}],
                        "puzzleItems": [],
                    }
                ],
            },
        }
    ]
    md, matched = build_injected_prior_context_markdown(
        json.dumps(rows),
        ("promotion_candidates",),
    )
    assert "Promotion picks" in md
    assert matched == ["promotion_candidates"]


def test_extract_promotion_candidates_data_prefers_last_populated_row() -> None:
    rows = [
        {
            "title": "Old picks",
            "presetId": "promotion_candidates",
            "data": {
                "mainCategory": "Mains",
                "categories": [{"category": "Mains", "starItems": [], "puzzleItems": []}],
            },
        },
        {
            "title": "Fresh picks",
            "presetId": "promotion_candidates",
            "data": {
                "mainCategory": "Mains",
                "categories": [
                    {
                        "category": "Mains",
                        "starItems": [{"name": "Pasta", "popularity": 0.3}],
                        "puzzleItems": [],
                    }
                ],
            },
        },
    ]
    data = extract_promotion_candidates_data(json.dumps(rows))
    assert data is not None
    assert data["categories"][0]["starItems"][0]["name"] == "Pasta"
    row = extract_promotion_candidates_row(json.dumps(rows))
    assert row is not None
    assert row["title"] == "Fresh picks"


def test_promotion_candidates_prior_error_message_when_no_prior_rows() -> None:
    message = promotion_candidates_prior_error_message("[]")
    assert "No earlier milestones" in message


def test_build_injected_prior_menu_tagger_shape_fallback() -> None:
    rows = [
        {
            "title": "Tagged menu",
            "presetId": None,
            "data": {
                "taxonomyVersion": "v2",
                "items": [
                    {
                        "name": "Latte",
                        "role": "star",
                        "category": "DRINK",
                        "tags": {"kind": "drink", "course": ["beverage"]},
                    }
                ],
                "usedTags": {},
            },
        }
    ]
    md, matched = build_injected_prior_context_markdown(json.dumps(rows), ("menu_tagger",))
    assert "Tagged menu" in md
    assert matched == ["menu_tagger"]


def test_extract_menu_tagger_data_prefers_last_populated_row() -> None:
    rows = [
        {
            "title": "Old tags",
            "presetId": "menu_tagger",
            "data": {"taxonomyVersion": "v2", "items": [], "usedTags": {}},
        },
        {
            "title": "Fresh tags",
            "presetId": "menu_tagger",
            "data": {
                "taxonomyVersion": "v2",
                "items": [
                    {
                        "name": "Burger",
                        "role": "star",
                        "category": "FOOD",
                        "tags": {"kind": "food", "course": ["main"]},
                    }
                ],
                "usedTags": {},
            },
        },
    ]
    data = extract_menu_tagger_data(json.dumps(rows))
    assert data is not None
    assert data["items"][0]["name"] == "Burger"


def test_extract_campaign_brief_row_prefers_selected_milestone_id() -> None:
    brief_a = {
        "venueSnapshot": {"venueName": "A"},
        "contentPillars": [],
        "audienceHypotheses": [],
        "proofOrientedAngles": [],
        "toneGuardrails": [],
        "mainCategory": "Mains",
    }
    brief_b = {
        "venueSnapshot": {"venueName": "B"},
        "contentPillars": [],
        "audienceHypotheses": [],
        "proofOrientedAngles": [],
        "toneGuardrails": [],
        "mainCategory": "Drinks",
    }
    rows = [
        {
            "id": "10",
            "title": "Brief A",
            "presetId": "restaurant_campaign_brief",
            "data": brief_a,
        },
        {
            "id": "20",
            "title": "Brief B",
            "presetId": "restaurant_campaign_brief",
            "data": brief_b,
        },
    ]
    row = extract_restaurant_campaign_brief_row(
        json.dumps(rows),
        preferred_milestone_id="10",
    )
    assert row is not None
    assert row["id"] == "10"
    assert row["title"] == "Brief A"


def test_preferred_milestone_id_from_input_reads_value_field() -> None:
    assert (
        preferred_milestone_id_from_input(
            {
                "type": "ig_plan",
                "value": {"notes": "", "sourceCampaignBriefMilestoneId": "42"},
            },
            "sourceCampaignBriefMilestoneId",
        )
        == "42"
    )
    assert preferred_milestone_id_from_input({"type": "ig_plan", "value": {}}, "x") is None

