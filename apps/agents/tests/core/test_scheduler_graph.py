"""Tests for scheduler graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.scheduler.nodes import (
    _post_slot_detail,
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
                            "description": "Monthly pin carousel concept summary.",
                            "captionGuidance": "Lead with hero mains and a reservation CTA.",
                            "groupIds": ["group-1"],
                            "slides": [
                                {
                                    "dishName": "Ribeye",
                                    "imageBrief": "Hero menu photography brief.",
                                }
                            ],
                        },
                        {
                            "id": "weekday-lunch-post-week-2026-06-01",
                            "format": "carousel",
                            "intent": "weekday_lunch_post",
                            "title": "Weekday lunch at Cafe Alto",
                            "description": "Weekday lunch carousel for nearby workers.",
                            "captionGuidance": "Keep copy concise; mention the lunch offer window.",
                            "groupIds": ["group-1"],
                            "slides": [
                                {
                                    "dishName": "Ribeye",
                                    "imageBrief": "Lunch photography brief.",
                                }
                            ],
                        },
                        {
                            "id": "weekday-lunch-post-week-2026-06-08",
                            "format": "carousel",
                            "intent": "weekday_lunch_post",
                            "title": "Weekday lunch at Cafe Alto",
                            "description": "Weekday lunch carousel for nearby workers.",
                            "captionGuidance": "Keep copy concise; mention the lunch offer window.",
                            "groupIds": ["group-1"],
                            "slides": [
                                {
                                    "dishName": "Ribeye",
                                    "imageBrief": "Lunch photography brief.",
                                }
                            ],
                        },
                        {
                            "id": "weekday-lunch-post-week-2026-06-15",
                            "format": "carousel",
                            "intent": "weekday_lunch_post",
                            "title": "Weekday lunch at Cafe Alto",
                            "description": "Weekday lunch carousel for nearby workers.",
                            "captionGuidance": "Keep copy concise; mention the lunch offer window.",
                            "groupIds": ["group-1"],
                            "slides": [
                                {
                                    "dishName": "Ribeye",
                                    "imageBrief": "Lunch photography brief.",
                                }
                            ],
                        },
                        {
                            "id": "weekday-lunch-post-week-2026-06-22",
                            "format": "carousel",
                            "intent": "weekday_lunch_post",
                            "title": "Weekday lunch at Cafe Alto",
                            "description": "Weekday lunch carousel for nearby workers.",
                            "captionGuidance": "Keep copy concise; mention the lunch offer window.",
                            "groupIds": ["group-1"],
                            "slides": [
                                {
                                    "dishName": "Ribeye",
                                    "imageBrief": "Lunch photography brief.",
                                }
                            ],
                        },
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
                            "id": "story-user-review",
                            "title": "Story: positive customer review",
                            "fixdate": False,
                            "reason": "user_review",
                            "intervalWeeks": 4,
                            "time": "14:00",
                        },
                        {
                            "id": "story-public-holiday-2026-06-15-easter-sunday",
                            "title": "Story: sending happy Easter Sunday",
                            "date": "2026-06-15",
                            "fixdate": True,
                            "reason": "public_holiday",
                            "holidayName": "Easter Sunday",
                            "time": "10:00",
                        },
                    ],
                    "sourceDatesTitle": "Campaign dates",
                },
            },
        ]
    )


_EXPECTED_MONTHLY_POST_DETAIL = {
    "id": "pinned-monthly-menu",
    "format": "carousel",
    "intent": "pinned_monthly_menu",
    "title": "Monthly top menu",
    "description": "Monthly pin carousel concept summary.",
    "captionGuidance": "Lead with hero mains and a reservation CTA.",
    "groupIds": ["group-1"],
    "slides": [
        {
            "dishName": "Ribeye",
            "imageBrief": "Hero menu photography brief.",
        }
    ],
}

_EXPECTED_WEEKLY_POST_DETAIL = {
    "id": "weekday-lunch-post-week-2026-06-01",
    "format": "carousel",
    "intent": "weekday_lunch_post",
    "title": "Weekday lunch at Cafe Alto",
    "description": "Weekday lunch carousel for nearby workers.",
    "captionGuidance": "Keep copy concise; mention the lunch offer window.",
    "groupIds": ["group-1"],
    "slides": [
        {
            "dishName": "Ribeye",
            "imageBrief": "Lunch photography brief.",
        }
    ],
}


def test_post_slot_detail_passes_description_and_caption_guidance() -> None:
    post = {
        "id": "pinned-monthly-menu",
        "format": "carousel",
        "intent": "pinned_monthly_menu",
        "title": "Monthly top menu",
        "description": "Monthly pin carousel concept summary.",
        "captionGuidance": "Lead with hero mains and a reservation CTA.",
        "groupIds": ["group-1"],
        "slides": [{"dishName": "Ribeye", "imageBrief": "Hero menu photography brief."}],
    }
    assert _post_slot_detail(post) == _EXPECTED_MONTHLY_POST_DETAIL


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
async def test_fetch_and_prepare_reads_prior_dates_campaign_brief_and_lineups() -> None:
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
        assert result["source_post_lineup_title"] == "Monthly Post Lineup"
        assert result["source_story_lineup_title"] == "Holiday Story Lineup"


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
async def test_build_snapshot_creates_post_and_story_slots_without_reels() -> None:
    prior = json.loads(_prior_json())
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            post_lineup_data=prior[3]["data"],
            story_lineup_data=prior[4]["data"],
            source_dates_title="Campaign dates",
            source_campaign_brief_title="Campaign brief",
            source_post_lineup_title="Monthly Post Lineup",
            source_story_lineup_title="Holiday Story Lineup",
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["sourceCampaignBriefTitle"] == "Campaign brief"
    assert normalized["sourcePostLineupTitle"] == "Monthly Post Lineup"
    assert normalized["sourceStoryLineupTitle"] == "Holiday Story Lineup"
    assert not any(slot.get("kind") == "reel" for slot in normalized["slots"])
    post_slots = [slot for slot in normalized["slots"] if slot.get("kind") == "post"]
    assert post_slots[0] == {
        "kind": "post",
        "date": "2026-06-01",
        "time": "10:00",
        "title": "Monthly top menu",
        "post": _EXPECTED_MONTHLY_POST_DETAIL,
    }
    weekly_post_slots = [
        slot for slot in post_slots if slot["title"] == "Weekday lunch at Cafe Alto"
    ]
    assert [slot["date"] for slot in weekly_post_slots] == [
        "2026-06-04",
        "2026-06-11",
        "2026-06-18",
        "2026-06-25",
    ]
    assert {
        "kind": "story",
        "date": "2026-06-15",
        "time": "10:00",
        "title": "Story: sending happy Easter Sunday",
    } in normalized["slots"]
    assert {
        "kind": "story",
        "date": "2026-06-03",
        "time": "14:00",
        "title": "Story: positive customer review",
    } in normalized["slots"]


@pytest.mark.asyncio
async def test_build_snapshot_schedules_user_review_every_four_weeks() -> None:
    prior = json.loads(_prior_json())
    prior[0]["data"]["endDate"] = "2026-08-31"
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            post_lineup_data=prior[3]["data"],
            story_lineup_data=prior[4]["data"],
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    user_review_slots = [
        slot
        for slot in normalized["slots"]
        if slot.get("title") == "Story: positive customer review"
    ]
    assert len(user_review_slots) == 3
    assert user_review_slots[0]["date"] == "2026-06-03"
    assert user_review_slots[1]["date"] == "2026-07-08"
    assert user_review_slots[2]["date"] == "2026-07-29"


@pytest.mark.asyncio
async def test_build_snapshot_repeats_monthly_top_menu_on_first_of_each_month() -> None:
    prior = json.loads(_prior_json())
    prior[0]["data"]["endDate"] = "2026-07-31"
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            campaign_brief_data=prior[1]["data"],
            post_lineup_data=prior[3]["data"],
            story_lineup_data=prior[4]["data"],
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    monthly_post_slots = [
        slot
        for slot in normalized["slots"]
        if slot["kind"] == "post" and slot["title"] == "Monthly top menu"
    ]
    assert monthly_post_slots == [
        {
            "kind": "post",
            "date": "2026-06-01",
            "time": "10:00",
            "title": "Monthly top menu",
            "post": _EXPECTED_MONTHLY_POST_DETAIL,
        },
        {
            "kind": "post",
            "date": "2026-07-01",
            "time": "10:00",
            "title": "Monthly top menu",
            "post": _EXPECTED_MONTHLY_POST_DETAIL,
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
async def test_build_weekly_post_slots_uses_campaign_weeks() -> None:
    from agents_app.agents.core.milestone_run.scheduler.nodes import _build_weekly_post_slots

    post_lineup_data = {
        "posts": [
            {
                "id": "weekday-lunch-post-week-2026-06-01",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Week 1 lunch",
                "slides": [
                    {
                        "dishName": "Ribeye",
                        "imageBrief": "Week 1 lunch photography brief.",
                    }
                ],
                "groupIds": ["group-1"],
            },
            {
                "id": "weekday-lunch-post-week-2026-06-08",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Week 2 lunch",
                "slides": [
                    {
                        "dishName": "Burger",
                        "imageBrief": "Week 2 lunch photography brief.",
                    }
                ],
                "groupIds": ["group-1"],
            },
        ]
    }

    slots = _build_weekly_post_slots(
        post_lineup_data,
        campaign_brief_data=_prior_json_campaign_brief(),
        start_date="2026-06-01",
        end_date="2026-06-14",
    )
    assert [slot["date"] for slot in slots] == ["2026-06-04", "2026-06-11"]
    assert all(slot["time"] == "10:00" for slot in slots)


def _prior_json_campaign_brief() -> dict:
    return json.loads(_prior_json())[1]["data"]


@pytest.mark.asyncio
async def test_build_weekly_post_slots_uses_fixdated_posts() -> None:
    from agents_app.agents.core.milestone_run.scheduler.nodes import _build_weekly_post_slots

    post_lineup_data = {
        "posts": [
            {
                "id": "weekday-lunch-post-week-2026-06-01",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Week 1 lunch",
                "date": "2026-06-04",
                "fixdate": True,
                "scheduleHints": {"preferredWeekdays": ["thursday"], "preferredTime": "10:00"},
                "slides": [
                    {
                        "dishName": "Ribeye",
                        "imageBrief": "Week 1 lunch photography brief.",
                    }
                ],
                "groupIds": ["group-1"],
            },
            {
                "id": "weekday-lunch-post-week-2026-06-08",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Week 2 lunch",
                "date": "2026-06-11",
                "fixdate": True,
                "scheduleHints": {"preferredWeekdays": ["thursday"], "preferredTime": "10:00"},
                "slides": [
                    {
                        "dishName": "Burger",
                        "imageBrief": "Week 2 lunch photography brief.",
                    }
                ],
                "groupIds": ["group-1"],
            },
        ]
    }

    slots = _build_weekly_post_slots(
        post_lineup_data,
        campaign_brief_data=None,
        start_date="2026-06-01",
        end_date="2026-06-30",
    )
    assert slots == [
        {
            "kind": "post",
            "date": "2026-06-04",
            "time": "10:00",
            "title": "Week 1 lunch",
            "post": {
                "id": "weekday-lunch-post-week-2026-06-01",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Week 1 lunch",
                "groupIds": ["group-1"],
                "slides": [
                    {
                        "dishName": "Ribeye",
                        "imageBrief": "Week 1 lunch photography brief.",
                    }
                ],
            },
        },
        {
            "kind": "post",
            "date": "2026-06-11",
            "time": "10:00",
            "title": "Week 2 lunch",
            "post": {
                "id": "weekday-lunch-post-week-2026-06-08",
                "format": "carousel",
                "intent": "weekday_lunch_post",
                "title": "Week 2 lunch",
                "groupIds": ["group-1"],
                "slides": [
                    {
                        "dishName": "Burger",
                        "imageBrief": "Week 2 lunch photography brief.",
                    }
                ],
            },
        },
    ]
