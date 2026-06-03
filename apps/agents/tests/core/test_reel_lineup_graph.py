"""Tests for reel_lineup build, merge, and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.reel_lineup.build import (
    build_reel_lineup_from_plan,
    validate_static_hero_groups,
)
from agents_app.agents.core.milestone_run.reel_lineup.nodes import (
    ReelLineupDraftOutput,
    ReelLineupPlannedReelDraft,
    _weekly_reels_from_planned_reels,
    fetch_and_prepare,
    persist_result,
    plan_reels,
)

START_DATE = "2026-06-01"
END_DATE = "2026-06-30"


def _groups() -> list[dict]:
    return [
        {
            "id": "group-1",
            "leadName": "Ribeye",
            "creativeRole": "hero",
            "anchor": {"dimension": "reel_moment", "value": "static_hero"},
            "items": [
                {
                    "name": "Ribeye",
                    "role": "star",
                    "category": "MAINS",
                    "storytellingFit": "strong",
                    "reelMoment": "static_hero",
                }
            ],
        },
        {
            "id": "group-4",
            "leadName": "Burger",
            "creativeRole": "proof",
            "anchor": {"dimension": "reel_moment", "value": "static_hero"},
            "items": [
                {
                    "name": "Burger",
                    "role": "star",
                    "category": "MAINS",
                    "storytellingFit": "strong",
                    "reelMoment": "static_hero",
                }
            ],
        },
        {
            "id": "group-2",
            "leadName": "Burger",
            "creativeRole": "proof",
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
        "campaignObjective": "Increase weekday lunch visits",
        "contentPillars": ["Hero signatures"],
        "audienceHypotheses": ["Lunch workers"],
        "proofOrientedAngles": ["Top sellers"],
        "toneGuardrails": ["Be specific"],
        "mainCategory": "Mains",
    }


def _weekly_reels_for_window() -> list[dict]:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    return [
        {
            "weekIndex": week.week_index,
            "weekdayReel": {
                "groupId": "group-1",
                "title": f"Week {week.week_index} weekday reel",
                "description": f"Weekday visual hook for week {week.week_index}.",
                "explanation": f"Why weekday lunch fits week {week.week_index}.",
            },
            "weekendReel": {
                "groupId": "group-4",
                "title": f"Week {week.week_index} weekend reel",
                "description": f"Weekend visual hook for week {week.week_index}.",
                "explanation": f"Why weekend social fits week {week.week_index}.",
            },
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
                    "foodLeads": [],
                    "groups": _groups(),
                    "unassignedItemNames": [],
                },
            },
        ]
    )


def test_build_reel_lineup_from_plan_creates_weekday_and_weekend_reels() -> None:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    payload = build_reel_lineup_from_plan(
        weekly_reels=_weekly_reels_for_window(),
        campaign_weeks=weeks,
        groups=_groups(),
        campaign_brief_data=_campaign_brief_data(),
        start_date=START_DATE,
        end_date=END_DATE,
        source_menu_clusterer_title="Menu clusterer",
        source_campaign_brief_title="Campaign brief",
        source_dates_title="Campaign dates",
    )
    normalized, error = validate_skill_output("reel_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["reels"]) == len(weeks) * 2
    weekday_reels = [r for r in normalized["reels"] if r["intent"] == "weekday_reel"]
    weekend_reels = [r for r in normalized["reels"] if r["intent"] == "weekend_reel"]
    assert len(weekday_reels) == len(weeks)
    assert len(weekend_reels) == len(weeks)
    assert all(reel["groupIds"] == ["group-1"] for reel in weekday_reels)
    assert all(reel["groupIds"] == ["group-4"] for reel in weekend_reels)
    assert all(reel["description"] and reel["explanation"] for reel in normalized["reels"])
    assert all(
        reel["scheduleHints"]["preferredWeekdays"] == ["thursday"]
        for reel in weekday_reels
    )
    assert all(
        reel["scheduleHints"]["preferredTime"] == "11:00" for reel in normalized["reels"]
    )
    assert all(
        reel["scheduleHints"]["preferredWeekdays"] == ["saturday", "sunday"]
        for reel in weekend_reels
    )
    hero_dish = normalized["reels"][0]["heroDishes"][0]
    assert hero_dish["name"] == "Ribeye"
    assert hero_dish["category"] == "MAINS"
    assert hero_dish["storytellingFit"] == "strong"
    assert hero_dish["reelMoment"] == "static_hero"
    assert hero_dish["role"] == "star"


def test_validate_static_hero_groups_rejects_non_hero_clusters() -> None:
    proof_only = [_groups()[2]]
    with pytest.raises(ValueError, match="static_hero|hero"):
        validate_static_hero_groups(proof_only)


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_dates_milestone() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.reel_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="dates"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "1",
                "location_id": 1,
                "user_id": "u",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": "[]",
                "result_data": "",
                "milestonedata_written": False,
            },
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_fetch_and_prepare_loads_priors() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.reel_lineup.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        out = await fetch_and_prepare(
            {
                "milestone_id": "1",
                "location_id": 1,
                "user_id": "u",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": _prior_json(),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=AsyncMock(),
        )
    assert out["start_date"] == START_DATE
    assert out["end_date"] == END_DATE
    assert len(out["campaign_weeks"]) >= 1
    assert len(out["groups"]) == 3


def test_weekly_reels_from_planned_reels_groups_flat_rows() -> None:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    planned = [
        ReelLineupPlannedReelDraft(
            weekIndex=week.week_index,
            intent="weekday_reel",
            groupId="group-1",
            title=f"Week {week.week_index} weekday",
            description="Weekday description.",
            explanation="Weekday explanation.",
        )
        for week in weeks
    ] + [
        ReelLineupPlannedReelDraft(
            weekIndex=week.week_index,
            intent="weekend_reel",
            groupId="group-4",
            title=f"Week {week.week_index} weekend",
            description="Weekend description.",
            explanation="Weekend explanation.",
        )
        for week in weeks
    ]
    weekly = _weekly_reels_from_planned_reels(planned, expected_week_count=len(weeks))
    assert len(weekly) == len(weeks)
    assert weekly[0]["weekdayReel"]["groupId"] == "group-1"
    assert weekly[0]["weekendReel"]["groupId"] == "group-4"


@pytest.mark.asyncio
async def test_plan_reels_merges_llm_draft() -> None:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    planned = [
        ReelLineupPlannedReelDraft(
            weekIndex=week.week_index,
            intent="weekday_reel",
            groupId="group-1",
            title=f"Week {week.week_index} weekday",
            description="Weekday description.",
            explanation="Weekday explanation.",
        )
        for week in weeks
    ] + [
        ReelLineupPlannedReelDraft(
            weekIndex=week.week_index,
            intent="weekend_reel",
            groupId="group-4",
            title=f"Week {week.week_index} weekend",
            description="Weekend description.",
            explanation="Weekend explanation.",
        )
        for week in weeks
    ]
    draft = ReelLineupDraftOutput(reels=planned)
    state = {
        "milestone_id": "1",
        "location_id": 1,
        "user_id": "u",
        "goal": "",
        "criteria": [],
        "result_data": "",
        "milestonedata_written": False,
        "campaign_brief_data": _campaign_brief_data(),
        "groups": _groups(),
        "start_date": START_DATE,
        "end_date": END_DATE,
        "campaign_weeks": weeks,
        "owner_notes_markdown": "",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.reel_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.reel_lineup.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=draft),
        ),
    ):
        out = await plan_reels(state)  # type: ignore[arg-type]
    assert out["generated_output"]["reels"]
    assert len(out["generated_output"]["reels"]) == len(weeks) * 2


@pytest.mark.asyncio
async def test_persist_result_writes_milestonedata() -> None:
    weeks = campaign_weeks(START_DATE, END_DATE, campaign_brief_data=_campaign_brief_data())
    payload = build_reel_lineup_from_plan(
        weekly_reels=_weekly_reels_for_window(),
        campaign_weeks=weeks,
        groups=_groups(),
        campaign_brief_data=_campaign_brief_data(),
        start_date=START_DATE,
        end_date=END_DATE,
    )
    client = AsyncMock()
    with patch(
        "agents_app.agents.core.milestone_run.reel_lineup.nodes.upsert_milestonedata_node",
        new_callable=AsyncMock,
    ) as upsert:
        out = await persist_result(
            {
                "milestone_id": "99",
                "location_id": 1,
                "user_id": "u",
                "goal": "",
                "criteria": [],
                "generated_output": payload,
                "result_data": "",
                "milestonedata_written": False,
            },
            client=client,
        )
    upsert.assert_awaited_once()
    assert out["milestonedata_written"] is True
