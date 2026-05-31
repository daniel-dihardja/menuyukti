"""Tests for post_lineup build, merge, and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup_from_plan
from agents_app.agents.core.milestone_run.post_lineup.nodes import (
    PostLineupDraftOutput,
    PostLineupPostPlanDraft,
    fetch_and_prepare,
    persist_result,
    plan_posts,
)


def _food_leads() -> list[dict]:
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
            "tags": shared_tags,
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "tags": {**shared_tags, "ingredient": ["bread"], "reel_moment": "stack"},
        },
    ]


def _groups() -> list[dict]:
    return [
        {
            "id": "group-1",
            "leadName": "Ribeye",
            "items": [
                {
                    "name": "Ribeye",
                    "role": "star",
                    "category": "MAINS",
                    "storytellingFit": "strong",
                    "reelMoment": "sizzle",
                }
            ],
        },
        {
            "id": "group-2",
            "leadName": "Burger",
            "items": [
                {
                    "name": "Burger",
                    "role": "star",
                    "category": "MAINS",
                    "storytellingFit": "strong",
                    "reelMoment": "stack",
                }
            ],
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
            "offerWindow": "11:00-14:00",
        },
        "contentPillars": ["Hero signatures", "Category variety", "Behind-the-scenes craft"],
        "audienceHypotheses": ["Lunch workers", "Weekend families", "Evening diners"],
        "proofOrientedAngles": ["Top sellers", "Weekend mix", "Meal-period demand"],
        "toneGuardrails": ["Be specific", "Keep copy concise", "Use operational language"],
        "campaignObjective": "Increase reservations",
        "mainCategory": "Mains",
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
                "title": "Menu clusterer",
                "presetId": "menu_clusterer",
                "data": {
                    "foodLeads": _food_leads(),
                    "groups": _groups(),
                    "unassignedItemNames": [],
                },
            },
        ]
    )


def test_build_post_lineup_from_plan_creates_two_posts() -> None:
    payload = build_post_lineup_from_plan(
        monthly_post={
            "intent": "pinned_monthly_menu",
            "title": "Cafe Alto signature menu",
            "groupIds": ["group-1", "group-2"],
        },
        weekly_post={
            "intent": "weekday_lunch_post",
            "title": "Weekday lunch at Cafe Alto",
            "groupIds": ["group-1"],
        },
        groups=_groups(),
        food_leads=_food_leads(),
        campaign_brief_data=_campaign_brief_data(),
        source_menu_clusterer_title="Menu clusterer",
        source_campaign_brief_title="Campaign brief",
    )
    normalized, error = validate_skill_output("post_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["posts"]) == 2
    monthly = next(
        post for post in normalized["posts"] if post["intent"] == "pinned_monthly_menu"
    )
    weekly = next(
        post for post in normalized["posts"] if post["intent"] == "weekday_lunch_post"
    )
    assert monthly["format"] == "carousel"
    assert len(monthly["slides"]) == 2
    assert monthly["slides"][0]["dishName"] == "Ribeye"
    assert monthly["groupIds"] == ["group-1", "group-2"]
    assert weekly["scheduleHints"]["preferredWeekdays"] == ["tuesday"]
    assert normalized["sourceMenuClustererTitle"] == "Menu clusterer"
    assert normalized["sourceCampaignBriefTitle"] == "Campaign brief"


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_campaign_brief_and_groups() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
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
                "prior_milestones_data": "[]",
            },
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_plan_posts_mocks_llm_and_persists() -> None:
    draft = PostLineupDraftOutput(
        monthlyPost=PostLineupPostPlanDraft(
            intent="pinned_monthly_menu",
            title="Cafe Alto signature menu",
            groupIds=["group-1", "group-2"],
            rationale="Monthly signatures from hero groups.",
        ),
        weeklyPost=PostLineupPostPlanDraft(
            intent="weekday_lunch_post",
            title="Weekday lunch at Cafe Alto",
            groupIds=["group-1"],
            rationale="Lunch hero group supports weekday demand.",
        ),
    )

    with (
        patch(
            "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.post_lineup.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=draft),
        ),
    ):
        built = await plan_posts(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "campaign_brief_data": _campaign_brief_data(),
                "groups": _groups(),
                "food_leads": _food_leads(),
                "source_menu_clusterer_title": "Menu clusterer",
                "source_campaign_brief_title": "Campaign brief",
            }
        )

    assert len(built["generated_output"]["posts"]) == 2

    client = AsyncMock()
    with patch(
        "agents_app.agents.core.milestone_run.post_lineup.nodes.upsert_milestonedata_node",
        new_callable=AsyncMock,
    ) as upsert:
        result = await persist_result(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "generated_output": built["generated_output"],
            },
            client=client,
        )
    upsert.assert_awaited_once()
    assert result["milestonedata_written"] is True
    assert len(json.loads(result["result_data"])["posts"]) == 2


@pytest.mark.asyncio
async def test_fetch_and_prepare_loads_groups_and_brief() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        prepared = await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": _prior_json(),
            },
            client=AsyncMock(),
        )
    assert len(prepared["groups"]) == 2
    assert prepared["source_campaign_brief_title"] == "Campaign brief"
    assert prepared["source_menu_clusterer_title"] == "Menu clusterer"
