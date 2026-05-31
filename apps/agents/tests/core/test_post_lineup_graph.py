"""Tests for post_lineup build, merge, and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup_from_plan
from agents_app.agents.core.milestone_run.post_lineup.nodes import (
    PostLineupDraftOutput,
    PostLineupPostPlanDraft,
    fetch_and_prepare,
    persist_result,
    plan_posts,
)

START_DATE = "2026-06-01"
END_DATE = "2026-06-30"


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


def _weekly_posts_for_window() -> list[dict]:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    return [
        {
            "weekIndex": week.week_index,
            "intent": "weekday_lunch_post",
            "title": f"Week {week.week_index} lunch at Cafe Alto",
            "groupIds": ["group-1" if week.week_index % 2 else "group-2"],
            "description": f"Lunch carousel for week {week.week_index} highlighting hero mains.",
            "captionGuidance": (
                "Keep copy concise; lead with lunch offer window 11:00-14:00 and a clear reservation CTA."
            ),
        }
        for week in weeks
    ]


def _prior_json() -> str:
    return json.dumps(
        [
            {
                "title": "Campaign dates",
                "presetId": "dates",
                "data": {
                    "startDate": START_DATE,
                    "endDate": END_DATE,
                    "publicHolidays": [],
                },
            },
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


def test_build_post_lineup_from_plan_creates_monthly_and_weekly_posts() -> None:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    payload = build_post_lineup_from_plan(
        monthly_post={
            "intent": "pinned_monthly_menu",
            "title": "Cafe Alto signature menu",
            "groupIds": ["group-1", "group-2"],
            "description": "Monthly pin showcasing signature mains from hero groups.",
            "captionGuidance": (
                "Be specific about hero signatures; use operational language and invite reservations."
            ),
        },
        weekly_posts=_weekly_posts_for_window(),
        campaign_weeks=weeks,
        groups=_groups(),
        food_leads=_food_leads(),
        campaign_brief_data=_campaign_brief_data(),
        start_date=START_DATE,
        end_date=END_DATE,
        source_menu_clusterer_title="Menu clusterer",
        source_campaign_brief_title="Campaign brief",
        source_dates_title="Campaign dates",
    )
    normalized, error = validate_skill_output("post_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["posts"]) == 1 + len(weeks)
    monthly = next(post for post in normalized["posts"] if post["intent"] == "pinned_monthly_menu")
    weekly_posts = [post for post in normalized["posts"] if post["intent"] == "weekday_lunch_post"]
    assert monthly["format"] == "carousel"
    assert len(monthly["slides"]) == 2
    assert monthly["description"]
    assert monthly["captionGuidance"]
    assert len(weekly_posts) == len(weeks)
    assert all(post["description"] for post in weekly_posts)
    assert all(post["captionGuidance"] for post in weekly_posts)
    assert all(post["fixdate"] is True for post in weekly_posts)
    assert all(post.get("date") for post in weekly_posts)
    assert normalized["startDate"] == START_DATE
    assert normalized["endDate"] == END_DATE
    assert normalized["sourceDatesTitle"] == "Campaign dates"


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_dates_milestone() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="dates"),
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
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    draft = PostLineupDraftOutput(
        monthlyPost=PostLineupPostPlanDraft(
            intent="pinned_monthly_menu",
            title="Cafe Alto signature menu",
            groupIds=["group-1", "group-2"],
            description="Monthly signatures from hero groups.",
            captionGuidance="Be specific; lead with hero mains and a reservation CTA.",
        ),
        weeklyPosts=[
            PostLineupPostPlanDraft(
                weekIndex=week.week_index,
                intent="weekday_lunch_post",
                title=f"Week {week.week_index} lunch at Cafe Alto",
                groupIds=["group-1"],
                description=f"Lunch hero group supports week {week.week_index}.",
                captionGuidance="Keep copy concise; mention lunch offer window and weekday timing.",
            )
            for week in weeks
        ],
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
                "start_date": START_DATE,
                "end_date": END_DATE,
                "campaign_weeks": weeks,
                "source_menu_clusterer_title": "Menu clusterer",
                "source_campaign_brief_title": "Campaign brief",
                "source_dates_title": "Campaign dates",
            }
        )

    assert len(built["generated_output"]["posts"]) == 1 + len(weeks)

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
    assert len(json.loads(result["result_data"])["posts"]) == 1 + len(weeks)


@pytest.mark.asyncio
async def test_fetch_and_prepare_loads_dates_groups_and_brief() -> None:
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
    assert prepared["start_date"] == START_DATE
    assert prepared["end_date"] == END_DATE
    assert len(prepared["campaign_weeks"]) == 5
    assert prepared["source_campaign_brief_title"] == "Campaign brief"
    assert prepared["source_menu_clusterer_title"] == "Menu clusterer"
    assert prepared["source_dates_title"] == "Campaign dates"
