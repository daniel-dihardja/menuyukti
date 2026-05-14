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
                            "name": "Holiday",
                            "description": "Desc",
                            "date": "2026-06-15",
                        }
                    ],
                },
            }
        ]
    )


@pytest.mark.asyncio
async def test_fetch_and_prepare_reads_prior_dates() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        result = await fetch_and_prepare(
            {
                "milestone_id": "1",
                "location_id": 1,
                "user_id": "user",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": _prior_json(),
                "result_data": "",
                "milestonedata_written": False,
            },
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
            {
                "milestone_id": "1",
                "location_id": 1,
                "user_id": "user",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": "[]",
                "result_data": "",
                "milestonedata_written": False,
            },
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_build_snapshot_creates_valid_payload() -> None:
    result = await build_snapshot(
        {
            "milestone_id": "1",
            "location_id": 1,
            "user_id": "user",
            "goal": "",
            "criteria": [],
            "dates_data": {
                "startDate": "2026-06-01",
                "endDate": "2026-06-30",
                "publicHolidays": [],
            },
            "source_dates_title": "Campaign dates",
            "result_data": "",
            "milestonedata_written": False,
        }
    )
    normalized, error = validate_skill_output("scheduler", result["generated_output"])
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["startDate"] == "2026-06-01"
    assert normalized["endDate"] == "2026-06-30"
    assert normalized["sourceDatesTitle"] == "Campaign dates"
    assert normalized["slots"] == []


@pytest.mark.asyncio
async def test_persist_result_upserts_scheduler_payload() -> None:
    client = AsyncMock()
    payload = {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [],
        "slots": [],
    }
    with patch(
        "agents_app.agents.core.milestone_run.scheduler.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        result = await persist_result(
            {
                "milestone_id": "9",
                "location_id": 2,
                "user_id": "user",
                "goal": "",
                "criteria": [],
                "generated_output": payload,
                "result_data": "",
                "milestonedata_written": False,
            },
            client=client,
        )
        upsert.assert_awaited_once()
        assert result["milestonedata_written"] is True
        assert result["milestone_data"]["startDate"] == "2026-06-01"
