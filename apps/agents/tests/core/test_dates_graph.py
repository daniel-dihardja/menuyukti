"""Tests for dedicated dates deterministic graph nodes."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.dates.nodes import fetch_dates_context, persist_result
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output


async def _fake_eval_astream(*_a: object, **_k: object):
    yield (
        "values",
        {
            "evaluated": [{"id": "c1", "status": "pass"}],
            "result_summary": "S1",
            "result_node_id": "rn1",
        },
    )


def _minimal_initial() -> dict:
    return {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "workflow_id": None,
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "prior_milestones_data": "",
        "preset_id": "",
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
    }


def _valid_dates_payload() -> dict:
    return {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [
            {"name": "Holiday A", "description": "Regional holiday", "date": "2026-06-05"},
            {"name": "Holiday B", "description": "National holiday", "date": "2026-06-18"},
        ],
    }


@pytest.mark.asyncio
async def test_routing_dates_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_dates_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"startDate":"2026-06-01","endDate":"2026-06-30","publicHolidays":[]}',
                "milestone_data": _valid_dates_payload(),
                "milestonedata_written": True,
            },
        )

    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(return_value={"data": {"goal": "G1", "presetId": "dates"}}),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have dates", "status": "open"}
                        ],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch(
            "agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph",
            return_value=mock_eval,
        ),
        patch("agents_app.agents.core.milestone_run.graph.build_dates_graph") as mock_build_dates,
    ):
        mock_dates_graph = MagicMock()
        mock_dates_graph.astream = _fake_dates_astream
        mock_build_dates.return_value = mock_dates_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_build_dates.assert_called_once()
    assert out.get("milestonedata_written") is True


def test_output_schema_valid_dates_payload() -> None:
    normalized, error = validate_skill_output("dates", _valid_dates_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["startDate"] == "2026-06-01"


@pytest.mark.asyncio
async def test_fetch_dates_context_happy_path() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "milestone_input": {
            "type": "dates",
            "value": {"startDate": "2026-06-01", "endDate": "2026-06-30"},
        },
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.dates.nodes.fetch_public_holidays_for_milestone",
            new=AsyncMock(
                return_value=(
                    [{"name": "Holiday A", "description": "X", "date": "2026-06-05"}],
                    None,
                )
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.dates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await fetch_dates_context(state, client=MagicMock(spec=AsyncMock))
    assert out["start_date"] == "2026-06-01"
    assert out["end_date"] == "2026-06-30"
    assert isinstance(out["public_holidays"], list)


@pytest.mark.asyncio
async def test_fetch_dates_context_rejects_missing_window() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "milestone_input": {"type": "dates", "value": {"startDate": ""}},
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.dates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="dates requires startDate and endDate"),
    ):
        await fetch_dates_context(state, client=MagicMock(spec=AsyncMock))


@pytest.mark.asyncio
async def test_fetch_dates_context_surfaces_holiday_fetch_error() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "milestone_input": {
            "type": "dates",
            "value": {"startDate": "2026-06-01", "endDate": "2026-06-30"},
        },
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.dates.nodes.fetch_public_holidays_for_milestone",
            new=AsyncMock(return_value=([], "Invalid date range")),
        ),
        patch(
            "agents_app.agents.core.milestone_run.dates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="Invalid date range"),
    ):
        await fetch_dates_context(state, client=MagicMock(spec=AsyncMock))


@pytest.mark.asyncio
async def test_persist_result_writes_dates_payload() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "start_date": "2026-06-01",
        "end_date": "2026-06-30",
        "public_holidays": [
            {"name": "Holiday A", "description": "Regional holiday", "date": "2026-06-05"}
        ],
    }
    with patch(
        "agents_app.agents.core.milestone_run.dates.nodes.upsert_milestonedata_node",
        new=AsyncMock(return_value={}),
    ) as mock_upsert:
        out = await persist_result(state, client=MagicMock(spec=AsyncMock))

    mock_upsert.assert_awaited_once()
    assert out["milestonedata_written"] is True
    assert isinstance(out["milestone_data"], dict)
