"""Tests for scheduler graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.scheduler.nodes import (
    HolidayGreetingPick,
    SchedulerHolidayGreetingsDraft,
    _fmt_owner_holiday_notes,
    build_snapshot,
    fetch_and_prepare,
    persist_result,
    select_holiday_greetings,
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
                        },
                        {
                            "name": "Memorial Day",
                            "description": "Solemn",
                            "date": "2026-06-20",
                        },
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
        "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await fetch_and_prepare(
            _base_state(prior_milestones_data=_prior_json()),
            client=AsyncMock(),
        )
        assert result["source_dates_title"] == "Campaign dates"
        assert result["dates_data"]["startDate"] == "2026-06-01"


@pytest.mark.asyncio
async def test_fetch_and_prepare_raises_without_prior_dates() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="scheduler requires a prior dates milestone"),
    ):
        await fetch_and_prepare(
            _base_state(prior_milestones_data="[]"),
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_select_holiday_greetings_skips_llm_when_no_holidays() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await select_holiday_greetings(
            _base_state(
                dates_data={
                    "startDate": "2026-06-01",
                    "endDate": "2026-06-30",
                    "publicHolidays": [],
                }
            )
        )
        assert result["holiday_greeting_picks"] == []


def test_fmt_owner_holiday_notes_returns_empty_for_missing_or_wrong_type() -> None:
    assert _fmt_owner_holiday_notes(_base_state()) == ""
    assert (
        _fmt_owner_holiday_notes(
            _base_state(milestone_input={"type": "menu_tagger", "value": {"notes": "x"}})
        )
        == ""
    )
    assert (
        _fmt_owner_holiday_notes(
            _base_state(milestone_input={"type": "scheduler", "value": {"notes": "   "}})
        )
        == ""
    )


def test_fmt_owner_holiday_notes_formats_scheduler_notes() -> None:
    text = _fmt_owner_holiday_notes(
        _base_state(
            milestone_input={
                "type": "scheduler",
                "value": {"notes": "Mark Easter Sunday; skip Memorial Day"},
            }
        )
    )
    assert "Milestone input (owner holiday guidance)" in text
    assert "Mark Easter Sunday; skip Memorial Day" in text


@pytest.mark.asyncio
async def test_select_holiday_greetings_includes_owner_notes_in_human_message() -> None:
    draft = SchedulerHolidayGreetingsDraft(holidayGreetings=[])
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=draft)
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.structured_llm_from_milestone_run_config",
            return_value=MagicMock(with_structured_output=MagicMock(return_value=mock_llm)),
        ),
    ):
        await select_holiday_greetings(
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
                milestone_input={
                    "type": "scheduler",
                    "value": {"notes": "Mark Easter Sunday"},
                },
            )
        )
        messages = mock_llm.ainvoke.await_args.args[0]
        human_content = messages[1].content
        assert "Mark Easter Sunday" in human_content
        assert "Milestone input (owner holiday guidance)" in human_content


@pytest.mark.asyncio
async def test_select_holiday_greetings_calls_llm() -> None:
    draft = SchedulerHolidayGreetingsDraft(
        holidayGreetings=[
            HolidayGreetingPick(date="2026-06-15", holidayName="Easter Sunday"),
        ]
    )
    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=draft)
    with (
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.scheduler.nodes.structured_llm_from_milestone_run_config",
            return_value=MagicMock(with_structured_output=MagicMock(return_value=mock_llm)),
        ),
    ):
        result = await select_holiday_greetings(
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
        mock_llm.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_build_snapshot_creates_holiday_greeting_slots() -> None:
    result = await build_snapshot(
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
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["startDate"] == "2026-06-01"
    assert normalized["endDate"] == "2026-06-30"
    assert normalized["sourceDatesTitle"] == "Campaign dates"
    assert normalized["slots"] == [
        {
            "date": "2026-06-15",
            "time": "10:00",
            "title": "Story: sending happy Easter Sunday",
        }
    ]


@pytest.mark.asyncio
async def test_build_snapshot_drops_invalid_llm_picks() -> None:
    result = await build_snapshot(
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
                {"date": "2026-07-01", "holidayName": "Easter Sunday"},
                {"date": "2026-06-15", "holidayName": "Wrong Name"},
            ],
        )
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["slots"] == []


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
        assert result["milestone_data"]["startDate"] == "2026-06-01"
