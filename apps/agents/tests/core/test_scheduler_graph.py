"""Tests for LLM-driven scheduler graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.scheduler.nodes import (
    SchedulerDraftOutput,
    SchedulerDraftSlot,
    fetch_and_prepare,
    generate_schedule_with_llm,
    persist_result,
)


def _prior_json() -> str:
    rows = [
        {
            "title": "Campaign dates",
            "presetId": "dates",
            "data": {
                "startDate": "2026-06-01",
                "endDate": "2026-06-28",
                "publicHolidays": [{"name": "Holiday", "description": "Desc", "date": "2026-06-15"}],
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
                    "offerWindow": "11:00-14:00",
                    "strategyFocus": "weekday_lunch",
                    "audiencePriority": ["Office workers", "Families", "Dinner crowd"],
                    "coreMessage": "Promote weekday lunch deals.",
                    "cadenceGuidance": ["Rule 1", "Rule 2", "Rule 3"],
                },
                "contentPillars": ["Hero dishes", "Social proof", "Story reminders"],
                "audienceHypotheses": ["A", "B", "C"],
                "proofOrientedAngles": ["A", "B", "C"],
                "toneGuardrails": ["A", "B", "C"],
                "campaignObjective": "Increase lunch bookings",
                "mainCategory": "Mains",
                "targetSegments": ["A", "B", "C"],
                "messageHierarchy": ["A", "B", "C"],
                "offerAndCtaPlan": ["A", "B", "C"],
                "contentPillarPlan": ["A", "B", "C"],
                "measurementPlan": ["A", "B", "C"],
                "testingPlan": ["A", "B", "C"],
                "riskGuardrails": ["A", "B", "C"],
            },
        },
        {
            "title": "Post lineup",
            "presetId": "post_lineup",
            "data": {
                "posts": [
                    {
                        "id": "post-monthly",
                        "format": "carousel",
                        "intent": "pinned_monthly_menu",
                        "title": "Monthly top menu",
                        "description": "desc",
                        "captionGuidance": "caption",
                        "groupIds": ["g1"],
                        "slides": [{"dishName": "Dish", "imageBrief": "img"}],
                    },
                    {
                        "id": "post-w1",
                        "format": "carousel",
                        "intent": "weekday_lunch_post",
                        "title": "Week 1 lunch",
                        "description": "desc",
                        "captionGuidance": "caption",
                        "groupIds": ["g1"],
                        "slides": [{"dishName": "Dish", "imageBrief": "img"}],
                    },
                    {
                        "id": "post-w2",
                        "format": "carousel",
                        "intent": "weekday_lunch_post",
                        "title": "Week 2 lunch",
                        "description": "desc",
                        "captionGuidance": "caption",
                        "groupIds": ["g1"],
                        "slides": [{"dishName": "Dish", "imageBrief": "img"}],
                    },
                    {
                        "id": "post-w3",
                        "format": "carousel",
                        "intent": "weekday_lunch_post",
                        "title": "Week 3 lunch",
                        "description": "desc",
                        "captionGuidance": "caption",
                        "groupIds": ["g1"],
                        "slides": [{"dishName": "Dish", "imageBrief": "img"}],
                    },
                    {
                        "id": "post-w4",
                        "format": "carousel",
                        "intent": "weekday_lunch_post",
                        "title": "Week 4 lunch",
                        "description": "desc",
                        "captionGuidance": "caption",
                        "groupIds": ["g1"],
                        "slides": [{"dishName": "Dish", "imageBrief": "img"}],
                    },
                ]
            },
        },
        {
            "title": "Story lineup",
            "presetId": "story_lineup",
            "data": {
                "stories": [
                    {
                        "id": "story-fixed-1",
                        "title": "Story fixed",
                        "fixdate": True,
                        "date": "2026-06-15",
                        "reason": "public_holiday",
                        "time": "10:00",
                    },
                    {
                        "id": "story-user-review",
                        "title": "Story: positive customer review",
                        "fixdate": False,
                        "reason": "user_review",
                        "intervalWeeks": 4,
                        "time": "14:00",
                    },
                ]
            },
        },
        {
            "title": "Reel lineup",
            "presetId": "reel_lineup",
            "data": {
                "reels": [
                    {
                        "id": "reel-weekday-1",
                        "format": "reel",
                        "intent": "weekday_reel",
                        "title": "Weekday 1",
                        "description": "desc",
                        "explanation": "exp",
                        "groupIds": ["g1"],
                    },
                    {
                        "id": "reel-weekday-2",
                        "format": "reel",
                        "intent": "weekday_reel",
                        "title": "Weekday 2",
                        "description": "desc",
                        "explanation": "exp",
                        "groupIds": ["g1"],
                    },
                    {
                        "id": "reel-weekday-3",
                        "format": "reel",
                        "intent": "weekday_reel",
                        "title": "Weekday 3",
                        "description": "desc",
                        "explanation": "exp",
                        "groupIds": ["g1"],
                    },
                    {
                        "id": "reel-weekday-4",
                        "format": "reel",
                        "intent": "weekday_reel",
                        "title": "Weekday 4",
                        "description": "desc",
                        "explanation": "exp",
                        "groupIds": ["g1"],
                    },
                    {
                        "id": "reel-weekend-1",
                        "format": "reel",
                        "intent": "weekend_reel",
                        "title": "Weekend 1",
                        "description": "desc",
                        "explanation": "exp",
                        "groupIds": ["g1"],
                    },
                ]
            },
        },
    ]
    return json.dumps(rows)


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


def _valid_draft() -> SchedulerDraftOutput:
    return SchedulerDraftOutput(
        slots=[
            SchedulerDraftSlot(
                kind="post",
                date="2026-06-01",
                time="12:00",
                title="Monthly top menu",
                sourceId="post-monthly",
            ),
            SchedulerDraftSlot(kind="post", date="2026-06-03", time="12:30", title="Week 1 lunch", sourceId="post-w1"),
            SchedulerDraftSlot(kind="post", date="2026-06-10", time="12:30", title="Week 2 lunch", sourceId="post-w2"),
            SchedulerDraftSlot(kind="post", date="2026-06-17", time="12:30", title="Week 3 lunch", sourceId="post-w3"),
            SchedulerDraftSlot(kind="post", date="2026-06-24", time="12:30", title="Week 4 lunch", sourceId="post-w4"),
            SchedulerDraftSlot(kind="reel", date="2026-06-02", time="12:15", title="Reel weekday 1", sourceId="reel-weekday-1"),
            SchedulerDraftSlot(kind="reel", date="2026-06-09", time="12:15", title="Reel weekday 2", sourceId="reel-weekday-2"),
            SchedulerDraftSlot(kind="reel", date="2026-06-16", time="12:15", title="Reel weekday 3", sourceId="reel-weekday-3"),
            SchedulerDraftSlot(kind="reel", date="2026-06-23", time="12:15", title="Reel weekday 4", sourceId="reel-weekday-4"),
            SchedulerDraftSlot(kind="reel", date="2026-06-07", time="12:15", title="Reel weekend 1", sourceId="reel-weekend-1"),
            SchedulerDraftSlot(kind="story", date="2026-06-15", time="10:00", title="Story fixed", sourceId="story-fixed-1"),
            SchedulerDraftSlot(
                kind="story",
                date="2026-06-11",
                time="14:00",
                title="Story: positive customer review",
                sourceId="story-user-review",
            ),
        ]
    )


@pytest.mark.asyncio
async def test_fetch_and_prepare_reads_prior_milestones() -> None:
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
    assert result["source_post_lineup_title"] == "Post lineup"
    assert result["source_story_lineup_title"] == "Story lineup"
    assert result["source_reel_lineup_title"] == "Reel lineup"


@pytest.mark.asyncio
async def test_generate_schedule_with_llm_success() -> None:
    prior = json.loads(_prior_json())
    state = _base_state(
        dates_data=prior[0]["data"],
        campaign_brief_data=prior[1]["data"],
        post_lineup_data=prior[2]["data"],
        story_lineup_data=prior[3]["data"],
        reel_lineup_data=prior[4]["data"],
    )
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=_valid_draft()),
        ),
    ):
        result = await generate_schedule_with_llm(state)
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["startDate"] == "2026-06-01"
    assert normalized["endDate"] == "2026-06-28"
    assert len(normalized["slots"]) == 12


@pytest.mark.asyncio
async def test_generate_schedule_with_llm_retries_then_succeeds() -> None:
    prior = json.loads(_prior_json())
    invalid = SchedulerDraftOutput(
        slots=[slot for slot in _valid_draft().slots if slot.sourceId != "story-user-review"]
    )
    state = _base_state(
        dates_data=prior[0]["data"],
        campaign_brief_data=prior[1]["data"],
        post_lineup_data=prior[2]["data"],
        story_lineup_data=prior[3]["data"],
        reel_lineup_data=prior[4]["data"],
    )
    invoke = AsyncMock(side_effect=[invalid, _valid_draft()])
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.structured_ainvoke_from_run_config",
            new=invoke,
        ),
    ):
        result = await generate_schedule_with_llm(state)
    assert isinstance(result["generated_output"], dict)
    assert invoke.await_count == 2


@pytest.mark.asyncio
async def test_generate_schedule_with_llm_fails_after_max_attempts() -> None:
    prior = json.loads(_prior_json())
    invalid = SchedulerDraftOutput(
        slots=[slot for slot in _valid_draft().slots if slot.sourceId != "story-user-review"]
    )
    state = _base_state(
        dates_data=prior[0]["data"],
        campaign_brief_data=prior[1]["data"],
        post_lineup_data=prior[2]["data"],
        story_lineup_data=prior[3]["data"],
        reel_lineup_data=prior[4]["data"],
    )
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=invalid),
        ),
        pytest.raises(ValueError, match="scheduler planning failed after 3 attempts"),
    ):
        await generate_schedule_with_llm(state)


@pytest.mark.asyncio
async def test_persist_result_upserts_scheduler_payload() -> None:
    client = AsyncMock()
    payload = {
        "startDate": "2026-06-01",
        "endDate": "2026-06-28",
        "publicHolidays": [],
        "slots": [
            {
                "kind": "post",
                "date": "2026-06-01",
                "time": "12:00",
                "title": "Monthly top menu",
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
