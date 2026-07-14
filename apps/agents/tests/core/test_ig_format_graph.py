"""Tests for dedicated IG Format graph path and output schema."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.ig_format.nodes import (
    IgFormatEntryPickDraft,
    IgFormatPickOutput,
    _merge_menu_picker_with_formats,
    assign_formats_with_llm,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output


def _valid_plan_fields() -> dict:
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


def _menu_picker_entry(*, slot_key: str = "wednesday-afternoon", menu_count: int = 1) -> dict:
    menu_items = [
        {"menu": f"Dish {index + 1}", "rationale": f"Rationale {index + 1}."}
        for index in range(menu_count)
    ]
    return {**_valid_plan_fields(), "slotKey": slot_key, "menuItems": menu_items}


def _valid_menu_picker_payload() -> dict:
    return {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [_menu_picker_entry()],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgPlanTitle": "IG Plan",
    }


def _prior_milestones_json(*, payload: dict | None = None) -> str:
    return json.dumps(
        [
            {
                "title": "IG Menu Picker",
                "presetId": "ig_menu_picker",
                "data": payload if payload is not None else _valid_menu_picker_payload(),
            }
        ]
    )


def test_ig_format_output_schema_accepts_valid_payload() -> None:
    payload = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [
            {
                **_menu_picker_entry(),
                "type": "reel",
                "formatRationale": "Single hero dish suits motion-led discovery.",
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgMenuPickerTitle": "IG Menu Picker",
    }
    normalized, error = validate_skill_output("ig_format", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["entries"][0]["type"] == "reel"


def test_ig_format_output_schema_rejects_invalid_type() -> None:
    payload = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [
            {
                **_menu_picker_entry(),
                "type": "live",
                "formatRationale": "Invalid type.",
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    _, error = validate_skill_output("ig_format", payload)
    assert error is not None


def test_merge_menu_picker_with_formats_preserves_plan_and_menu_fields() -> None:
    source = [_menu_picker_entry()]
    picks = IgFormatPickOutput(
        entries=[
            IgFormatEntryPickDraft(
                slotKey="wednesday-afternoon",
                type="reel",
                formatRationale="Aggressive grow slot with one hero dish.",
            )
        ]
    )
    merged = _merge_menu_picker_with_formats(source_entries=source, picks=picks)
    assert len(merged) == 1
    row = merged[0]
    assert row["objective"] == "Increase afternoon traffic"
    assert row["menuItems"][0]["menu"] == "Dish 1"
    assert row["type"] == "reel"
    assert row["formatRationale"] == "Aggressive grow slot with one hero dish."


def test_merge_menu_picker_with_formats_rejects_carousel_with_one_item() -> None:
    source = [_menu_picker_entry(menu_count=1)]
    picks = IgFormatPickOutput(
        entries=[
            IgFormatEntryPickDraft(
                slotKey="wednesday-afternoon",
                type="post-carousel",
                formatRationale="Should fail with one dish.",
            )
        ]
    )
    with pytest.raises(ValueError, match="post-carousel requires"):
        _merge_menu_picker_with_formats(source_entries=source, picks=picks)


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_prior_menu_picker() -> None:
    client = MagicMock()
    state = {
        "location_id": 1,
        "user_id": "u1",
        "prior_milestones_data": "[]",
        "milestone_input": {"type": "ig_format", "value": {"notes": ""}},
    }
    with patch(
        "agents_app.agents.core.milestone_run.ig_format.nodes.get_stream_writer",
        return_value=lambda _payload: None,
    ):
        with pytest.raises(ValueError, match="prior ig_menu_picker"):
            await fetch_and_prepare(state, client=client)


@pytest.mark.asyncio
async def test_fetch_and_prepare_copies_all_menu_picker_entries() -> None:
    client = MagicMock()
    payload = _valid_menu_picker_payload()
    payload["entries"] = [
        _menu_picker_entry(slot_key="monday-lunch"),
        _menu_picker_entry(slot_key="wednesday-afternoon"),
    ]
    state = {
        "location_id": 1,
        "user_id": "u1",
        "prior_milestones_data": _prior_milestones_json(payload=payload),
        "milestone_input": {"type": "ig_format", "value": {"notes": "Favor reels"}},
        "goal": "Grow lunch",
    }
    with patch(
        "agents_app.agents.core.milestone_run.ig_format.nodes.get_stream_writer",
        return_value=lambda _payload: None,
    ):
        result = await fetch_and_prepare(state, client=client)

    assert len(result["source_menu_picker_entries"]) == 2
    assert "Favor reels" in result["generation_context_json"]


@pytest.mark.asyncio
async def test_assign_formats_with_llm_merges_picks_onto_menu_picker_rows() -> None:
    source_entry = _menu_picker_entry(menu_count=2)
    picks = IgFormatPickOutput(
        entries=[
            IgFormatEntryPickDraft(
                slotKey="wednesday-afternoon",
                type="post-carousel",
                formatRationale="Two dishes support swipe discovery.",
            )
        ]
    )
    state = {
        "goal": "",
        "prior_ig_menu_picker_data": _valid_menu_picker_payload(),
        "prior_ig_menu_picker_row": {"title": "IG Menu Picker"},
        "source_menu_picker_entries": [source_entry],
    }
    with patch(
        "agents_app.agents.core.milestone_run.ig_format.nodes.structured_ainvoke_from_run_config",
        new_callable=AsyncMock,
        return_value=picks,
    ):
        with patch(
            "agents_app.agents.core.milestone_run.ig_format.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ):
            result = await assign_formats_with_llm(state)

    output = result["generated_output"]
    assert output["entries"][0]["type"] == "post-carousel"
    assert len(output["entries"][0]["menuItems"]) == 2
    assert output["sourceIgMenuPickerTitle"] == "IG Menu Picker"


@pytest.mark.asyncio
async def test_persist_result_writes_eval_hints() -> None:
    client = MagicMock()
    generated = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [
            {
                **_menu_picker_entry(),
                "type": "story",
                "formatRationale": "Low-lift reminder slot.",
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": generated,
        "source_menu_picker_entries": [_menu_picker_entry()],
        "prior_ig_menu_picker_row": {"title": "IG Menu Picker"},
    }
    with patch(
        "agents_app.agents.core.milestone_run.ig_format.nodes.upsert_milestonedata_node",
        new_callable=AsyncMock,
    ) as mock_upsert:
        with patch(
            "agents_app.agents.core.milestone_run.ig_format.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ):
            result = await persist_result(state, client=client)

    mock_upsert.assert_awaited_once()
    payload = mock_upsert.await_args.args[2]
    assert payload["_evalHints"]["hasPriorIgMenuPicker"] is True
    assert result["milestonedata_written"] is True
