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
                "title": "Story lineup",
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


def _post_lineup_data() -> dict[str, object]:
    return {
        "posts": [
            {
                "id": "pinned-monthly-menu",
                "format": "carousel",
                "intent": "pinned_monthly_menu",
                "title": "Monthly top menu",
                "slides": [
                    {
                        "dishName": "Burger",
                        "imageBrief": "Hero shot of a burger.",
                    }
                ],
            }
        ],
    }


def _prior_json_with_post_lineup(
    *,
    start_date: str = "2026-06-01",
    end_date: str = "2026-06-30",
) -> str:
    rows = json.loads(_prior_json())
    rows.append(
        {
            "title": "Post lineup",
            "presetId": "post_lineup",
            "data": _post_lineup_data(),
        }
    )
    rows[0]["data"]["startDate"] = start_date
    rows[0]["data"]["endDate"] = end_date
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


@pytest.mark.asyncio
async def test_fetch_and_prepare_reads_prior_dates_and_story_lineup() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await fetch_and_prepare(
            _base_state(prior_milestones_data=_prior_json()),
            client=AsyncMock(),
        )
        assert result["source_dates_title"] == "Campaign dates"
        assert result["source_story_lineup_title"] == "Story lineup"
        assert len(result["story_lineup_data"]["stories"]) == 1


@pytest.mark.asyncio
async def test_fetch_and_prepare_raises_without_prior_story_lineup() -> None:
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
        pytest.raises(ValueError, match="scheduler requires a prior story_lineup milestone"),
    ):
        await fetch_and_prepare(
            _base_state(prior_milestones_data=prior),
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_build_snapshot_creates_story_slots_from_story_lineup() -> None:
    prior = json.loads(_prior_json())
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            story_lineup_data=prior[1]["data"],
            source_dates_title="Campaign dates",
            source_story_lineup_title="Story lineup",
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["sourceStoryLineupTitle"] == "Story lineup"
    assert normalized["slots"] == [
        {
            "date": "2026-06-15",
            "time": "10:00",
            "title": "Story: sending happy Easter Sunday",
        }
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
                "date": "2026-06-15",
                "time": "10:00",
                "title": "Story: sending happy Easter Sunday",
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
async def test_fetch_and_prepare_reads_prior_post_lineup() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await fetch_and_prepare(
            _base_state(prior_milestones_data=_prior_json_with_post_lineup()),
            client=AsyncMock(),
        )
        assert result["source_post_lineup_title"] == "Post lineup"
        assert result["post_lineup_data"]["posts"][0]["intent"] == "pinned_monthly_menu"


@pytest.mark.asyncio
async def test_build_snapshot_adds_monthly_post_slots_for_two_month_window() -> None:
    prior = json.loads(_prior_json_with_post_lineup(start_date="2026-06-01", end_date="2026-07-31"))
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            story_lineup_data=prior[1]["data"],
            post_lineup_data=prior[2]["data"],
            source_post_lineup_title="Post lineup",
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["sourcePostLineupTitle"] == "Post lineup"
    assert normalized["slots"] == [
        {
            "date": "2026-06-01",
            "time": "10:00",
            "title": "Post: monthly top menu",
        },
        {
            "date": "2026-06-15",
            "time": "10:00",
            "title": "Story: sending happy Easter Sunday",
        },
        {
            "date": "2026-07-01",
            "time": "10:00",
            "title": "Post: monthly top menu",
        },
    ]


@pytest.mark.asyncio
async def test_build_snapshot_includes_story_and_post_slots() -> None:
    prior = json.loads(_prior_json_with_post_lineup())
    result = await build_snapshot(
        _base_state(
            dates_data=prior[0]["data"],
            story_lineup_data=prior[1]["data"],
            post_lineup_data=prior[2]["data"],
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    titles = [slot["title"] for slot in normalized["slots"]]
    assert "Story: sending happy Easter Sunday" in titles
    assert "Post: monthly top menu" in titles
