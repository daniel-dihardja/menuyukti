"""Tests for reel_lineup clustering and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.reel_lineup.cluster import build_reel_lineup
from agents_app.agents.core.milestone_run.reel_lineup.nodes import (
    build_lineup,
    fetch_and_prepare,
    persist_result,
)


def _menu_tagger_items() -> list[dict]:
    shared_tags = {
        "kind": "food",
        "ingredient": ["meat"],
        "taste": ["savory"],
        "course": ["main"],
        "reel_moment": "sizzle",
        "texture": ["juicy"],
        "prep_style": ["grilled"],
        "occasion": ["dinner"],
        "serve_temp": "hot",
        "content_angle": [],
    }
    return [
        {
            "name": "Ribeye",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.9,
            "tags": shared_tags,
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.7,
            "tags": {**shared_tags, "ingredient": ["bread"]},
        },
        {
            "name": "Wings",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.4,
            "tags": {**shared_tags, "ingredient": ["poultry"]},
        },
    ]


def _campaign_brief_data() -> dict:
    return {
        "venueSnapshot": {
            "venueName": "Cafe Alto",
            "city": "Berlin",
            "country": "Germany",
            "currency": "EUR",
        },
        "overallStrategy": {
            "strategyFocus": "weekday_lunch",
            "audiencePriority": [
                "Weekday lunch nearby workers and office groups",
                "Evening after-work diners",
                "Weekend family groups",
            ],
            "coreMessage": "Promote a repeatable weekday lunch offer for nearby workers and small groups.",
            "offerWindow": "11:00-14:00",
            "cadenceGuidance": [
                "Publish lunch-offer reels once per week on Tuesday.",
                "Prioritize Tuesday morning posting before the lunch window.",
                "Keep the core lunch CTA consistent while rotating visuals and hero dishes.",
            ],
        },
        "contentPillars": ["Hero signatures", "Category variety", "Behind-the-scenes craft"],
        "audienceHypotheses": ["Lunch nearby workers", "Weekend family groups", "Evening social dining"],
        "proofOrientedAngles": ["Top sellers lead conversions", "Weekend mix supports bundles", "Meal-period demand shapes timing"],
        "toneGuardrails": ["Be specific", "Keep copy concise", "Use operational language"],
        "campaignObjective": "Increase reservations in conversion stage this month",
        "mainCategory": "Mains",
        "targetSegments": ["Weekday lunch workers", "Weekend family groups", "Evening social diners"],
        "messageHierarchy": [
            "Hero promise tied to signature dishes",
            "Proof from top menu and category signals",
            "CTA to reserve or DM for booking",
        ],
        "offerAndCtaPlan": [
            "Keep offers margin-safe and time-bounded",
            "Primary CTA uses reservation link",
            "DM fallback for high-intent booking questions",
        ],
        "contentPillarPlan": [
            "Signature dishes via Reels for discovery",
            "Social proof carousel for consideration",
            "Story reminders for conversion windows",
        ],
        "measurementPlan": [
            "Track saves and shares weekly",
            "Track profile visits and DM starts weekly",
            "If DM starts under target for 2 weeks then update CTA framing",
        ],
        "testingPlan": [
            "Test lunch vs dinner daypart windows",
            "Test Tuesday morning posting times",
            "Replace weak hooks after 2 weeks of flat save rate",
        ],
        "riskGuardrails": [
            "Avoid unverified claims",
            "Respect allergen and local promotion regulations",
            "Avoid discount-heavy messaging below margin floor",
        ],
    }


def _prior_json() -> str:
    return json.dumps(
        [
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": _campaign_brief_data(),
            },
            {
                "title": "Tagged menu",
                "presetId": "menu_tagger",
                "data": {"taxonomyVersion": "v2", "items": _menu_tagger_items(), "usedTags": {}},
            },
        ]
    )


def test_build_reel_lineup_creates_valid_hook_groups() -> None:
    payload = build_reel_lineup(
        menu_tagger_items=_menu_tagger_items(),
        campaign_brief_data=_campaign_brief_data(),
        source_campaign_brief_title="Campaign brief",
    )
    normalized, error = validate_skill_output("reel_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["foodLeads"]) == 2
    assert normalized["foodLeads"][0]["name"] == "Ribeye"
    assert len(normalized["groups"]) == 2
    assert normalized["drinkLeads"] == []
    assert normalized["drinkGroups"] == []
    first = normalized["groups"][0]
    assert first["items"][0]["name"] == "Ribeye"
    assert first["items"][0]["position"] == 1
    assert first["leadName"] == "Ribeye"
    assert first["strategyFocus"] == "weekday_lunch"
    assert first["scheduleHints"]["preferredWeekdays"] == ["tuesday"]
    assert normalized["sourceCampaignBriefTitle"] == "Campaign brief"
    assert "Wings" in normalized["unassignedItemNames"]


def test_build_reel_lineup_creates_drink_groups() -> None:
    drink_tags = {
        "kind": "drink",
        "ingredient": ["coffee"],
        "taste": ["sweet"],
        "course": ["beverage"],
        "reel_moment": "pour",
        "texture": ["silky"],
        "prep_style": ["blended"],
        "occasion": ["dinner"],
        "serve_temp": "cold",
        "content_angle": [],
    }
    items = _menu_tagger_items() + [
        {
            "name": "Latte",
            "role": "star",
            "category": "DRINKS",
            "storytellingFit": "weak",
            "tags": drink_tags,
        },
    ]
    payload = build_reel_lineup(
        menu_tagger_items=items,
        campaign_brief_data=_campaign_brief_data(),
    )
    normalized, error = validate_skill_output("reel_lineup", payload)
    assert error is None
    assert len(normalized["drinkLeads"]) == 1
    assert normalized["drinkLeads"][0]["name"] == "Latte"
    assert len(normalized["drinkGroups"]) == 1
    assert normalized["drinkGroups"][0]["id"] == "drink-group-1"
    assert normalized["drinkGroups"][0]["leadName"] == "Latte"
    assert "Latte" not in normalized["unassignedItemNames"]


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_menu_tagger() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.reel_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="menu_tagger"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": json.dumps(
                    [
                        {
                            "title": "Campaign brief",
                            "presetId": "restaurant_campaign_brief",
                            "data": _campaign_brief_data(),
                        }
                    ]
                ),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_campaign_brief() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.reel_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="restaurant_campaign_brief"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": json.dumps(
                    [
                        {
                            "title": "Tagged menu",
                            "presetId": "menu_tagger",
                            "data": {
                                "taxonomyVersion": "v2",
                                "items": _menu_tagger_items(),
                                "usedTags": {},
                            },
                        }
                    ]
                ),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )


@pytest.mark.asyncio
async def test_build_lineup_and_persist() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "campaign_brief_data": _campaign_brief_data(),
        "source_campaign_brief_title": "Campaign brief",
        "menu_tagger_items": _menu_tagger_items(),
        "source_menu_tagger_title": "Tagged menu",
        "owner_notes_markdown": "",
        "result_data": "",
        "milestonedata_written": False,
    }
    built = await build_lineup(state)  # type: ignore[arg-type]
    assert built["generated_output"]["groups"]
    assert built["generated_output"]["groups"][0]["scheduleHints"]["preferredTime"] == "11:00"

    with patch(
        "agents_app.agents.core.milestone_run.reel_lineup.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        saved = await persist_result({**state, **built}, client=MagicMock())  # type: ignore[arg-type]
        upsert.assert_awaited_once()
    assert saved["milestonedata_written"] is True
