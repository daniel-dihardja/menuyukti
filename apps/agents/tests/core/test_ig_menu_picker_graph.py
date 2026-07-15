"""Tests for dedicated IG Menu Picker graph path and output schema."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.ig_menu_picker.nodes import (
    IgMenuPickerEntryPickDraft,
    IgMenuPickerMenuItemDraft,
    IgMenuPickerPickOutput,
    _filter_plan_entries,
    _read_selected_slot_keys,
    fetch_and_prepare,
    persist_result,
    pick_menu_items_with_llm,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output


def _valid_ig_plan_entry() -> dict:
    return {
        "day": "wednesday",
        "slot": "14:30",
        "objective": "Increase afternoon traffic",
        "pillar": "hero",
        "mealPeriod": "afternoon",
        "productRole": "puzzle",
        "slotStrategy": "aggressively_grow",
        "slotKey": "wednesday-afternoon",
    }


def _valid_ig_plan_payload() -> dict:
    return {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [_valid_ig_plan_entry()],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }


def _slot_candidates_fixture() -> dict:
    return {
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "matrixAvailable": True,
        "coverageNotes": [],
        "slots": [
            {
                "day": "wednesday",
                "mealPeriod": "afternoon",
                "mealPeriodLabel": "Afternoon",
                "mealPeriodHoursLabel": "14:00-17:00",
                "orderCount": 80,
                "demandIndex": 0.7,
                "relativeDemand": "low",
                "posture": "grow",
                "recommendedCategories": ["puzzle"],
                "totalItemQuantity": 200,
                "insufficientData": False,
                "candidates": [
                    {
                        "menu": "Truffle Fries",
                        "globalCategory": "puzzle",
                        "recommendedUse": "hero",
                        "rank": 1,
                        "score": 0.88,
                    }
                ],
            }
        ],
    }


def _matrix_fixture() -> dict:
    return {
        "thresholds": {"avgPopularity": 0.5, "avgContributionMargin": 10.0},
        "distribution": [],
        "items": [
            {
                "menu": "Truffle Fries",
                "category": "puzzle",
                "action": "promote",
                "quantity": 50,
                "contributionMargin": 8.0,
                "weValue": 0.7,
            }
        ],
    }


def _prior_milestones_json() -> str:
    return json.dumps(
        [
            {
                "title": "IG Plan",
                "presetId": "ig_plan",
                "data": _valid_ig_plan_payload(),
            }
        ]
    )


def test_read_selected_slot_keys_empty_means_all() -> None:
    state = {
        "milestone_input": {
            "type": "ig_menu_picker",
            "value": {"notes": "", "selectedSlotKeys": []},
        }
    }
    assert _read_selected_slot_keys(state) is None


def test_read_selected_slot_keys_honors_explicit_subset() -> None:
    state = {
        "milestone_input": {
            "type": "ig_menu_picker",
            "value": {
                "notes": "",
                "selectedSlotKeys": ["wednesday-afternoon", "friday-evening"],
            },
        }
    }
    assert _read_selected_slot_keys(state) == {"wednesday-afternoon", "friday-evening"}


def test_read_selected_slot_keys_ignores_none_selected_sentinel() -> None:
    state = {
        "milestone_input": {
            "type": "ig_menu_picker",
            "value": {"notes": "", "selectedSlotKeys": ["__no_slots_selected__"]},
        }
    }
    assert _read_selected_slot_keys(state) is None


def test_filter_plan_entries_by_selection() -> None:
    entries = [
        _valid_ig_plan_entry(),
        {**_valid_ig_plan_entry(), "slotKey": "friday-evening", "day": "friday"},
    ]
    filtered = _filter_plan_entries(entries, {"wednesday-afternoon"})
    assert len(filtered) == 1
    assert filtered[0]["slotKey"] == "wednesday-afternoon"


def test_ig_menu_picker_output_schema_accepts_valid_payload() -> None:
    payload = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [
            {
                **_valid_ig_plan_entry(),
                "menuItems": [
                    {"menu": "Truffle Fries", "rationale": "High-margin puzzle for weak slot."}
                ],
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgPlanTitle": "IG Plan",
    }
    normalized, error = validate_skill_output("ig_menu_picker", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["entries"]) == 1
    assert len(normalized["entries"][0]["menuItems"]) == 1


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_analytics_run_id() -> None:
    client = MagicMock()
    state = {
        "location_id": 1,
        "user_id": "u1",
        "prior_milestones_data": _prior_milestones_json(),
        "milestone_input": {
            "type": "ig_menu_picker",
            "value": {"notes": "", "selectedSlotKeys": []},
        },
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
        pytest.raises(ValueError, match="workflow-pinned analytics run"),
    ):
        await fetch_and_prepare(state, client=client)


@pytest.mark.asyncio
async def test_fetch_and_prepare_passes_analytics_run_id_to_graphql() -> None:
    client = MagicMock()
    state = {
        "location_id": 1,
        "user_id": "u1",
        "analytics_run_id": "99",
        "prior_milestones_data": _prior_milestones_json(),
        "milestone_input": {
            "type": "ig_menu_picker",
            "value": {"notes": "", "selectedSlotKeys": []},
        },
    }
    fetched = {
        "analyticsRunId": "99",
        "locationRaw": {"name": "Test"},
        "slotPerformance": {"slots": []},
        "menuEngineeringMatrix": _matrix_fixture(),
        "slotMenuCandidates": _slot_candidates_fixture(),
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.fetch_ig_plan_inputs",
            new_callable=AsyncMock,
            return_value=fetched,
        ) as mock_fetch,
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        result = await fetch_and_prepare(state, client=client)

    mock_fetch.assert_awaited_once_with(1, "u1", client=client, analytics_run_id="99")
    assert result["analytics_run_id"] == "99"
    assert len(result["selected_plan_entries"]) == 1


@pytest.mark.asyncio
async def test_fetch_and_prepare_filters_to_selected_slot_keys() -> None:
    client = MagicMock()
    plan_payload = _valid_ig_plan_payload()
    plan_payload["entries"] = [
        _valid_ig_plan_entry(),
        {**_valid_ig_plan_entry(), "slotKey": "friday-evening", "day": "friday"},
    ]
    prior_json = json.dumps([{"title": "IG Plan", "presetId": "ig_plan", "data": plan_payload}])
    state = {
        "location_id": 1,
        "user_id": "u1",
        "analytics_run_id": "99",
        "prior_milestones_data": prior_json,
        "milestone_input": {
            "type": "ig_menu_picker",
            "value": {"notes": "", "selectedSlotKeys": ["wednesday-afternoon"]},
        },
    }
    fetched = {
        "analyticsRunId": "99",
        "locationRaw": {"name": "Test"},
        "slotPerformance": {"slots": []},
        "menuEngineeringMatrix": _matrix_fixture(),
        "slotMenuCandidates": _slot_candidates_fixture(),
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.fetch_ig_plan_inputs",
            new_callable=AsyncMock,
            return_value=fetched,
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        result = await fetch_and_prepare(state, client=client)

    assert len(result["selected_plan_entries"]) == 1
    assert result["selected_plan_entries"][0]["slotKey"] == "wednesday-afternoon"


@pytest.mark.asyncio
async def test_pick_menu_items_with_llm_merges_plan_and_picks() -> None:
    plan_entry = _valid_ig_plan_entry()
    picks = IgMenuPickerPickOutput(
        entries=[
            IgMenuPickerEntryPickDraft(
                slotKey="wednesday-afternoon",
                menuItems=[
                    IgMenuPickerMenuItemDraft(
                        menu="Truffle Fries",
                        rationale="Best puzzle candidate for afternoon push.",
                    )
                ],
            )
        ]
    )
    state = {
        "goal": "",
        "analytics_run_id": "42",
        "prior_ig_plan_data": _valid_ig_plan_payload(),
        "prior_ig_plan_row": {"title": "IG Plan"},
        "selected_plan_entries": [plan_entry],
        "slot_menu_candidates": _slot_candidates_fixture(),
        "generation_context_json": json.dumps({"entries": []}),
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.structured_ainvoke_from_run_config",
            new_callable=AsyncMock,
            return_value=picks,
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        result = await pick_menu_items_with_llm(state)

    output = result["generated_output"]
    assert output["sourceAnalyticsRunId"] == "42"
    assert output["sourceIgPlanTitle"] == "IG Plan"
    assert output["entries"][0]["menuItems"][0]["menu"] == "Truffle Fries"
    assert output["entries"][0]["objective"] == plan_entry["objective"]


@pytest.mark.asyncio
async def test_persist_result_upserts_milestonedata() -> None:
    client = MagicMock()
    payload = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [
            {
                **_valid_ig_plan_entry(),
                "menuItems": [{"menu": "Truffle Fries", "rationale": "Fit"}],
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": payload,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.upsert_milestonedata_node",
            new_callable=AsyncMock,
        ) as mock_upsert,
        patch(
            "agents_app.agents.core.milestone_run.ig_menu_picker.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        result = await persist_result(state, client=client)

    mock_upsert.assert_awaited_once()
    assert result["milestonedata_written"] is True
    assert "1 IG Plan slot" in result["result_data"]
