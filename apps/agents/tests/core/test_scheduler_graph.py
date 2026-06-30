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
from agents_app.agents.core.milestone_run.scheduler.prompts import (
    SCHEDULE_EXPLANATION_MAX_CHARS,
)
from pydantic import ValidationError


def _prior_json() -> str:
    rows = [
        {
            "title": "Campaign dates",
            "presetId": "dates",
            "data": {
                "startDate": "2026-06-01",
                "endDate": "2026-06-28",
                "publicHolidays": [
                    {"name": "Holiday", "description": "Desc", "date": "2026-06-15"}
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
                        "id": "top-five-mains",
                        "format": "carousel",
                        "intent": "top_five_category",
                        "title": "Top 5 MAINS",
                        "category": "MAINS",
                        "intervalWeeks": 2,
                        "fixdate": False,
                        "slides": [
                            {
                                "dishName": "Dish",
                                "imageBrief": "img",
                                "caption": "Caption.",
                            }
                        ],
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
                title="Top 5 MAINS",
                sourceId="top-five-mains",
            ),
            SchedulerDraftSlot(
                kind="post",
                date="2026-06-15",
                time="12:00",
                title="Top 5 MAINS",
                sourceId="top-five-mains",
            ),
            SchedulerDraftSlot(
                kind="reel",
                date="2026-06-02",
                time="12:15",
                title="Reel weekday 1",
                sourceId="reel-weekday-1",
            ),
            SchedulerDraftSlot(
                kind="reel",
                date="2026-06-09",
                time="12:15",
                title="Reel weekday 2",
                sourceId="reel-weekday-2",
            ),
            SchedulerDraftSlot(
                kind="reel",
                date="2026-06-16",
                time="12:15",
                title="Reel weekday 3",
                sourceId="reel-weekday-3",
            ),
            SchedulerDraftSlot(
                kind="reel",
                date="2026-06-23",
                time="12:15",
                title="Reel weekday 4",
                sourceId="reel-weekday-4",
            ),
            SchedulerDraftSlot(
                kind="reel",
                date="2026-06-07",
                time="12:15",
                title="Reel weekend 1",
                sourceId="reel-weekend-1",
            ),
            SchedulerDraftSlot(
                kind="story",
                date="2026-06-15",
                time="10:00",
                title="Story fixed",
                sourceId="story-fixed-1",
            ),
            SchedulerDraftSlot(
                kind="story",
                date="2026-06-11",
                time="14:00",
                title="Story: positive customer review",
                sourceId="story-user-review",
            ),
        ],
        scheduleExplanation=(
            "Weekday reels at 12:15 on Tuesday target lunch breaks in the offer window. "
            "Saturday 12:15 weekend reels reach leisure diners."
        ),
    )


def _prior_json_without_reel_lineup() -> str:
    rows = json.loads(_prior_json())
    return json.dumps([row for row in rows if row.get("presetId") != "reel_lineup"])


def _valid_draft_without_reels() -> SchedulerDraftOutput:
    return SchedulerDraftOutput(
        slots=[
            SchedulerDraftSlot(
                kind="post",
                date="2026-06-01",
                time="12:00",
                title="Top 5 MAINS",
                sourceId="top-five-mains",
            ),
            SchedulerDraftSlot(
                kind="post",
                date="2026-06-15",
                time="12:00",
                title="Top 5 MAINS",
                sourceId="top-five-mains",
            ),
            SchedulerDraftSlot(
                kind="story",
                date="2026-06-15",
                time="10:00",
                title="Story fixed",
                sourceId="story-fixed-1",
            ),
            SchedulerDraftSlot(
                kind="story",
                date="2026-06-11",
                time="14:00",
                title="Story: positive customer review",
                sourceId="story-user-review",
            ),
        ],
        scheduleExplanation=(
            "Top five posts land early in each block for category visibility. "
            "Stories follow fixed holiday and review cadence across the month."
        ),
    )


def test_scheduler_draft_rejects_overlong_schedule_explanation() -> None:
    with pytest.raises(ValidationError):
        SchedulerDraftOutput(
            slots=[],
            scheduleExplanation="x" * (SCHEDULE_EXPLANATION_MAX_CHARS + 1),
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
    assert len(normalized["slots"]) == 9
    post_slot = next(slot for slot in normalized["slots"] if slot.get("kind") == "post")
    assert post_slot.get("post", {}).get("category") == "MAINS"
    assert "scheduleExplanation" in normalized
    assert normalized["scheduleExplanation"]


@pytest.mark.asyncio
async def test_generate_schedule_with_llm_without_reel_lineup() -> None:
    prior = json.loads(_prior_json_without_reel_lineup())
    state = _base_state(
        dates_data=prior[0]["data"],
        campaign_brief_data=prior[1]["data"],
        post_lineup_data=prior[2]["data"],
        story_lineup_data=prior[3]["data"],
        reel_lineup_data=None,
    )
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=_valid_draft_without_reels()),
        ),
    ):
        result = await generate_schedule_with_llm(state)
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert all(slot.get("kind") != "reel" for slot in normalized["slots"])


@pytest.mark.asyncio
async def test_generate_schedule_with_llm_retries_then_succeeds() -> None:
    prior = json.loads(_prior_json())
    valid = _valid_draft()
    invalid = SchedulerDraftOutput(
        slots=[slot for slot in valid.slots if slot.sourceId != "story-user-review"],
        scheduleExplanation=valid.scheduleExplanation,
    )
    state = _base_state(
        dates_data=prior[0]["data"],
        campaign_brief_data=prior[1]["data"],
        post_lineup_data=prior[2]["data"],
        story_lineup_data=prior[3]["data"],
        reel_lineup_data=prior[4]["data"],
    )
    invoke = AsyncMock(side_effect=[invalid, valid])
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
    valid = _valid_draft()
    invalid = SchedulerDraftOutput(
        slots=[slot for slot in valid.slots if slot.sourceId != "story-user-review"],
        scheduleExplanation=valid.scheduleExplanation,
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
