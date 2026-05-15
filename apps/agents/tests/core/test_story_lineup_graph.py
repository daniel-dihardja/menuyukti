"""Tests for story_lineup graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.story_lineup.nodes import (
    HolidayGreetingPick,
    StoryLineupHolidayGreetingsDraft,
    _build_public_holiday_stories,
    _fmt_owner_holiday_notes,
    build_lineup,
    fetch_and_prepare,
    persist_result,
    select_public_holiday_stories,
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
            }
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
async def test_fetch_and_prepare_reads_prior_dates() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.story_lineup.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await fetch_and_prepare(
            _base_state(prior_milestones_data=_prior_json()),
            client=AsyncMock(),
        )
        assert result["source_dates_title"] == "Campaign dates"
        assert result["dates_data"]["startDate"] == "2026-06-01"


@pytest.mark.asyncio
async def test_select_public_holiday_stories_calls_llm() -> None:
    draft = StoryLineupHolidayGreetingsDraft(
        holidayGreetings=[HolidayGreetingPick(date="2026-06-15", holidayName="Easter Sunday")]
    )
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=draft)
    with (
        patch(
            "agents_app.agents.core.milestone_run.story_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.story_lineup.nodes.structured_llm_from_milestone_run_config",
            return_value=MagicMock(with_structured_output=MagicMock(return_value=mock_llm)),
        ),
    ):
        result = await select_public_holiday_stories(
            _base_state(
                dates_data={
                    "startDate": "2026-06-01",
                    "endDate": "2026-06-30",
                    "publicHolidays": [
                        {
                            "name": "Easter Sunday",
                            "description": "Desc",
                            "date": "2026-06-15",
                        }
                    ],
                }
            )
        )
        assert result["holiday_greeting_picks"] == [
            {"date": "2026-06-15", "holidayName": "Easter Sunday"}
        ]


def test_build_public_holiday_stories_sets_fixdate() -> None:
    stories = _build_public_holiday_stories(
        [{"date": "2026-06-15", "holidayName": "Easter Sunday"}],
        public_holidays=[{"name": "Easter Sunday", "description": "Desc", "date": "2026-06-15"}],
        start_date="2026-06-01",
        end_date="2026-06-30",
    )
    assert len(stories) == 1
    assert stories[0]["fixdate"] is True
    assert stories[0]["date"] == "2026-06-15"
    assert stories[0]["reason"] == "public_holiday"
    assert stories[0]["title"] == "Story: sending happy Easter Sunday"


def test_fmt_owner_holiday_notes_uses_story_lineup_input() -> None:
    text = _fmt_owner_holiday_notes(
        _base_state(
            milestone_input={
                "type": "story_lineup",
                "value": {"notes": "Mark Easter Sunday"},
            }
        )
    )
    assert "Mark Easter Sunday" in text


@pytest.mark.asyncio
async def test_build_lineup_persists_stories() -> None:
    result = await build_lineup(
        _base_state(
            dates_data={
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
            holiday_greeting_picks=[
                {"date": "2026-06-15", "holidayName": "Easter Sunday"},
            ],
            source_dates_title="Campaign dates",
        )
    )
    normalized, error = validate_skill_output("story_lineup", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["sourceDatesTitle"] == "Campaign dates"
    assert len(normalized["stories"]) == 1
    assert normalized["stories"][0]["fixdate"] is True


@pytest.mark.asyncio
async def test_persist_result_upserts_story_lineup_payload() -> None:
    client = AsyncMock()
    payload = {
        "stories": [
            {
                "id": "story-public-holiday-2026-06-15-easter-sunday",
                "title": "Story: sending happy Easter Sunday",
                "date": "2026-06-15",
                "fixdate": True,
                "reason": "public_holiday",
                "holidayName": "Easter Sunday",
            }
        ],
    }
    with patch(
        "agents_app.agents.core.milestone_run.story_lineup.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        result = await persist_result(
            _base_state(generated_output=payload),
            client=client,
        )
        upsert.assert_awaited_once()
        assert result["milestonedata_written"] is True
