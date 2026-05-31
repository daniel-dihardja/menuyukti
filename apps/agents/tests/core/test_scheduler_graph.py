"""Tests for scheduler graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.scheduler.nodes import (
    build_snapshot,
    fetch_and_prepare,
    persist_result,
)


def _prior_json() -> str:
    return json.dumps(
        [
            {
                "title": "Campaign dates",
                "presetId": "dates",
                "data": {
                    "startDate": "2026-06-01",
                    "endDate": "2026-06-30",
                    "publicHolidays": [
                        {
                            "name": "Easter Sunday",
                            "description": "Desc",
                            "date": "2026-06-15",
                        }
                    ],
                },
            },
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": {
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
                        "coreMessage": (
                            "Promote a repeatable weekday lunch offer for nearby workers "
                            "and small groups."
                        ),
                        "offerWindow": "11:00-14:00",
                        "cadenceGuidance": [
                            "Publish lunch-offer reels once per week on Tuesday.",
                            "Prioritize Tuesday morning posting before the lunch window.",
                            (
                                "Keep the core lunch CTA consistent while rotating visuals "
                                "and hero dishes."
                            ),
                        ],
                    },
                    "contentPillars": [
                        "Hero signatures",
                        "Category variety",
                        "Behind-the-scenes craft",
                    ],
                    "audienceHypotheses": [
                        "Lunch nearby workers",
                        "Weekend family groups",
                        "Evening social dining",
                    ],
                    "proofOrientedAngles": [
                        "Top sellers lead conversions",
                        "Weekend mix supports bundles",
                        "Meal-period demand shapes timing",
                    ],
                    "toneGuardrails": [
                        "Be specific",
                        "Keep copy concise",
                        "Use operational language",
                    ],
                    "campaignObjective": "Increase reservations in conversion stage this month",
                    "mainCategory": "Mains",
                    "targetSegments": [
                        "Weekday lunch workers",
                        "Weekend family groups",
                        "Evening social diners",
                    ],
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
                },
            },
            {
                "title": "Lunch Menu Clusterer",
                "presetId": "menu_clusterer",
                "data": {
                    "foodLeads": [
                        {
                            "name": "Ribeye",
                            "role": "star",
                            "category": "MAINS",
                            "tags": {
                                "kind": "food",
                                "ingredient": ["meat"],
                                "taste": ["savory"],
                                "course": ["main"],
                                "reel_moment": "sizzle",
                                "texture": ["juicy"],
                                "prep_style": ["grilled"],
                                "occasion": ["lunch"],
                                "serve_temp": "hot",
                                "content_angle": [],
                            },
                            "storytellingFit": "strong",
                        },
                        {
                            "name": "Burger",
                            "role": "star",
                            "category": "MAINS",
                            "tags": {
                                "kind": "food",
                                "ingredient": ["bread"],
                                "taste": ["savory"],
                                "course": ["main"],
                                "reel_moment": "stack",
                                "texture": ["juicy"],
                                "prep_style": ["grilled"],
                                "occasion": ["lunch"],
                                "serve_temp": "hot",
                                "content_angle": [],
                            },
                            "storytellingFit": "strong",
                        },
                    ],
                    "drinkLeads": [],
                    "groups": [
                        {
                            "id": "group-1",
                            "leadName": "Ribeye",
                            "profileId": "hook_reel",
                            "anchor": {"dimension": "reel_moment", "value": "sizzle"},
                            "items": [
                                {
                                    "name": "Ribeye",
                                    "role": "star",
                                    "category": "MAINS",
                                    "position": 1,
                                    "storytellingFit": "strong",
                                    "reelMoment": "sizzle",
                                }
                            ],
                            "mix": {
                                "priceLevels": [],
                                "storytellingStrongCount": 1,
                                "starCount": 1,
                                "puzzleCount": 0,
                            },
                            "strategyFocus": "weekday_lunch",
                            "coreMessage": (
                                "Promote a repeatable weekday lunch offer for nearby workers "
                                "and small groups."
                            ),
                            "creativeRole": "hero",
                            "assetHint": "Keep the lunch CTA consistent for 11:00-14:00.",
                            "scheduleHints": {
                                "preferredWeekdays": ["tuesday"],
                                "preferredTime": "11:00",
                                "cadenceEligible": True,
                            },
                        },
                        {
                            "id": "group-2",
                            "leadName": "Burger",
                            "profileId": "hook_reel",
                            "anchor": {"dimension": "reel_moment", "value": "stack"},
                            "items": [
                                {
                                    "name": "Burger",
                                    "role": "star",
                                    "category": "MAINS",
                                    "position": 1,
                                    "storytellingFit": "strong",
                                    "reelMoment": "stack",
                                }
                            ],
                            "mix": {
                                "priceLevels": [],
                                "storytellingStrongCount": 1,
                                "starCount": 1,
                                "puzzleCount": 0,
                            },
                            "strategyFocus": "weekday_lunch",
                            "coreMessage": (
                                "Promote a repeatable weekday lunch offer for nearby workers "
                                "and small groups."
                            ),
                            "creativeRole": "proof",
                            "assetHint": "Keep the lunch CTA consistent for 11:00-14:00.",
                            "scheduleHints": {
                                "preferredWeekdays": ["tuesday"],
                                "preferredTime": "11:00",
                                "cadenceEligible": True,
                            },
                        },
                    ],
                    "drinkGroups": [],
                    "unassignedItemNames": [],
                    "sourceCampaignBriefTitle": "Campaign brief",
                    "sourceMenuTaggerTitle": "Tagged menu",
                },
            },
            {
                "title": "Monthly Post Lineup",
                "presetId": "post_lineup",
                "data": {
                    "posts": [
                        {
                            "id": "pinned-monthly-menu",
                            "format": "carousel",
                            "intent": "pinned_monthly_menu",
                            "title": "Monthly top menu",
                            "slides": [
                                {
                                    "dishName": "Ribeye",
                                    "imageBrief": "Hero menu photography brief.",
                                }
                            ],
                        }
                    ],
                    "sourceMenuClustererTitle": "Lunch Menu Clusterer",
                },
            },
            {
                "title": "Holiday Story Lineup",
                "presetId": "story_lineup",
                "data": {
                    "stories": [
                        {
                            "id": "story-public-holiday-2026-06-15-easter-sunday",
                            "title": "Story: sending happy Easter Sunday",
                            "date": "2026-06-15",
                            "fixdate": True,
                            "reason": "public_holiday",
                            "holidayName": "Easter Sunday",
                            "time": "10:00",
                        }
                    ],
                    "sourceDatesTitle": "Campaign dates",
                },
            },
        ]
    )


def _base_state(**overrides: object) -> dict[str, object]:
    state: dict[str, object] = {
        "milestone_id": "1",
        "location_id": 1,
        "user_id": "user",
        "goal": "",
        "criteria": [],
        "result_data": "",
        "milestonedata_written": False,
    }
    state.update(overrides)
    return state


@pytest.mark.asyncio
async def test_fetch_and_prepare_reads_prior_dates_campaign_brief_and_menu_clusterer() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await fetch_and_prepare(
            _base_state(prior_milestones_data=_prior_json()),
            client=AsyncMock(),
        )
        assert result["source_dates_title"] == "Campaign dates"
        assert result["source_campaign_brief_title"] == "Campaign brief"
        assert result["source_menu_clusterer_title"] == "Lunch Menu Clusterer"
        assert result["source_post_lineup_title"] == "Monthly Post Lineup"
        assert result["source_story_lineup_title"] == "Holiday Story Lineup"
        assert len(result["menu_clusterer_data"]["groups"]) == 2


@pytest.mark.asyncio
async def test_fetch_and_prepare_raises_without_prior_campaign_brief() -> None:
    prior = json.dumps(
        [
            {
                "title": "Campaign dates",
                "presetId": "dates",
                "data": {
                    "startDate": "2026-06-01",
                    "endDate": "2026-06-30",
                    "publicHolidays": [],
                },
            }
        ]
    )
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(
            ValueError, match="scheduler requires a prior restaurant_campaign_brief milestone"
        ),
    ):
        await fetch_and_prepare(
            _base_state(prior_milestones_data=prior),
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_fetch_and_prepare_raises_without_prior_menu_clusterer() -> None:
    prior = json.dumps(json.loads(_prior_json())[:2])
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="scheduler requires a prior menu_clusterer milestone"),
    ):
        await fetch_and_prepare(
            _base_state(prior_milestones_data=prior),
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_build_snapshot_creates_reel_slots_from_menu_clusterer() -> None:
    prior = json.loads(_prior_json())
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            menu_clusterer_data=prior[2]["data"],
            post_lineup_data=prior[3]["data"],
            story_lineup_data=prior[4]["data"],
            source_dates_title="Campaign dates",
            source_campaign_brief_title="Campaign brief",
            source_menu_clusterer_title="Lunch Menu Clusterer",
            source_post_lineup_title="Monthly Post Lineup",
            source_story_lineup_title="Holiday Story Lineup",
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["sourceCampaignBriefTitle"] == "Campaign brief"
    assert normalized["sourceMenuClustererTitle"] == "Lunch Menu Clusterer"
    assert normalized["sourcePostLineupTitle"] == "Monthly Post Lineup"
    assert normalized["sourceStoryLineupTitle"] == "Holiday Story Lineup"
    assert normalized["slots"][:4] == [
        {
            "kind": "post",
            "date": "2026-06-01",
            "time": "10:00",
            "title": "Monthly top menu",
        },
        {
            "kind": "reel",
            "date": "2026-06-02",
            "time": "11:00",
            "title": "Reel: Ribeye lunch offer (11:00-14:00) [hero]",
        },
        {
            "kind": "reel",
            "date": "2026-06-09",
            "time": "11:00",
            "title": "Reel: Burger lunch offer (11:00-14:00) [proof]",
        },
        {
            "kind": "story",
            "date": "2026-06-15",
            "time": "10:00",
            "title": "Story: sending happy Easter Sunday",
        },
    ]
    assert {
        "kind": "story",
        "date": "2026-06-15",
        "time": "10:00",
        "title": "Story: sending happy Easter Sunday",
    } in normalized["slots"]


@pytest.mark.asyncio
async def test_build_snapshot_repeats_monthly_top_menu_on_first_of_each_month() -> None:
    prior = json.loads(_prior_json())
    prior[0]["data"]["endDate"] = "2026-07-31"
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            menu_clusterer_data=prior[2]["data"],
            post_lineup_data=prior[3]["data"],
            story_lineup_data=prior[4]["data"],
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    monthly_post_slots = [slot for slot in normalized["slots"] if slot["kind"] == "post"]
    assert monthly_post_slots == [
        {
            "kind": "post",
            "date": "2026-06-01",
            "time": "10:00",
            "title": "Monthly top menu",
        },
        {
            "kind": "post",
            "date": "2026-07-01",
            "time": "10:00",
            "title": "Monthly top menu",
        },
    ]


@pytest.mark.asyncio
async def test_persist_result_upserts_scheduler_payload() -> None:
    client = AsyncMock()
    payload = {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [],
        "slots": [
            {
                "kind": "reel",
                "date": "2026-06-02",
                "time": "11:00",
                "title": "Reel: Ribeye lunch offer (11:00-14:00) [hero]",
            }
        ],
    }
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        result = await persist_result(
            _base_state(generated_output=payload),
            client=client,
        )
        upsert.assert_awaited_once()
        assert result["milestonedata_written"] is True


@pytest.mark.asyncio
async def test_build_snapshot_rotates_groups_across_two_month_window() -> None:
    prior = json.loads(_prior_json())
    prior[0]["data"]["endDate"] = "2026-07-31"
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            menu_clusterer_data=prior[2]["data"],
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["slots"]) == 9
    assert normalized["slots"][0]["title"] == "Reel: Ribeye lunch offer (11:00-14:00) [hero]"
    assert normalized["slots"][1]["title"] == "Reel: Burger lunch offer (11:00-14:00) [proof]"


@pytest.mark.asyncio
async def test_build_snapshot_treats_human_readable_weekday_lunch_focus_as_tuesday_only() -> None:
    prior = json.loads(_prior_json())
    prior[1]["data"]["overallStrategy"]["strategyFocus"] = "Weekday Lunch"

    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            menu_clusterer_data=prior[2]["data"],
        )
    )

    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)

    reel_dates = [slot["date"] for slot in normalized["slots"] if slot["kind"] == "reel"]
    assert reel_dates == ["2026-06-02", "2026-06-09", "2026-06-16", "2026-06-23", "2026-06-30"]
