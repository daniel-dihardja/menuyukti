"""Tests for dedicated IG Text graph path and output schema."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.ig_text.nodes import (
    IgTextEntryDraft,
    IgTextFieldDraft,
    IgTextPickOutput,
    _merge_ig_format_with_texts,
    fetch_and_prepare,
    generate_texts_with_llm,
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


def _menu_item(menu: str = "Dish 1") -> dict:
    return {"menu": menu, "rationale": "Strong performer."}


def _format_entry(
    *,
    slot_key: str = "wednesday-afternoon",
    fmt_type: str = "post",
    menu_items: list[dict] | None = None,
) -> dict:
    return {
        **_valid_plan_fields(),
        "slotKey": slot_key,
        "menuItems": menu_items if menu_items is not None else [_menu_item()],
        "type": fmt_type,
        "formatRationale": "Static showcase fits the slot.",
    }


def _post_texts(menu: str = "Dish 1") -> list[dict[str, str]]:
    return [
        {"field": "headline", "value": "Sarapan heula"},
        {"field": "subline", "value": "Start strong"},
        {"field": "productName", "value": menu},
        {"field": "caption", "value": "Order now."},
    ]


def _valid_format_payload() -> dict:
    return {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [_format_entry()],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgMenuPickerTitle": "IG Menu Picker",
    }


def _sample_campaign_brief() -> dict:
    return {
        "venueSnapshot": {"venueName": "Cafe Retro", "city": "Amsterdam", "country": "Netherlands"},
        "overallStrategy": {
            "strategyFocus": "Heritage brunch culture",
            "audiencePriority": ["Young creatives"],
            "coreMessage": "Nostalgic warmth",
            "offerWindow": "Weekends",
            "cadenceGuidance": ["Post twice weekly"],
        },
        "contentPillars": ["Heritage"],
        "audienceHypotheses": ["Weekend social groups"],
        "proofOrientedAngles": ["Family recipes"],
        "toneGuardrails": ["Warm and nostalgic"],
        "campaignObjective": "Grow weekend covers",
        "mainCategory": "Brunch",
        "targetSegments": ["Young creatives"],
        "messageHierarchy": ["Heritage brunch rituals"],
        "offerAndCtaPlan": ["Reserve a table"],
        "contentPillarPlan": ["Heritage stories"],
        "measurementPlan": ["Track reservations"],
        "testingPlan": ["Test hooks"],
        "riskGuardrails": ["No alcohol focus"],
    }


def _prior_milestones_json(*, payload: dict | None = None, include_brief: bool = True) -> str:
    rows: list[dict] = []
    if include_brief:
        rows.append(
            {
                "title": "Campaign Brief",
                "presetId": "restaurant_campaign_brief",
                "data": _sample_campaign_brief(),
            }
        )
    rows.append(
        {
            "title": "IG Format",
            "presetId": "ig_format",
            "data": payload if payload is not None else _valid_format_payload(),
        }
    )
    return json.dumps(rows)


def test_ig_text_output_schema_accepts_valid_post_payload() -> None:
    payload = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [{**_format_entry(), "texts": _post_texts()}],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgFormatTitle": "IG Format",
    }
    normalized, error = validate_skill_output("ig_text", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["entries"][0]["texts"][0]["field"] == "headline"


def test_ig_text_output_schema_rejects_missing_required_field() -> None:
    payload = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [
            {
                **_format_entry(),
                "texts": [
                    {"field": "headline", "value": "Only headline"},
                    {"field": "caption", "value": "Caption"},
                ],
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    _, error = validate_skill_output("ig_text", payload)
    assert error is not None


def test_ig_text_output_schema_accepts_carousel_indexed_fields() -> None:
    menu_a, menu_b = "Dish A", "Dish B"
    payload = {
        "scheduleExplanation": "Carousel for two dishes.",
        "entries": [
            {
                **_format_entry(
                    fmt_type="post-carousel",
                    menu_items=[_menu_item(menu_a), _menu_item(menu_b)],
                ),
                "texts": [
                    {"field": "slide_1_headline", "value": "First"},
                    {"field": "slide_1_productName", "value": menu_a},
                    {"field": "slide_2_headline", "value": "Second"},
                    {"field": "slide_2_productName", "value": menu_b},
                    {"field": "caption", "value": "Swipe through."},
                ],
            }
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    normalized, error = validate_skill_output("ig_text", payload)
    assert error is None
    assert isinstance(normalized, dict)


def test_merge_ig_format_with_texts_preserves_format_fields() -> None:
    source = [_format_entry()]
    picks = IgTextPickOutput(
        entries=[
            IgTextEntryDraft(
                slotKey="wednesday-afternoon",
                texts=[
                    IgTextFieldDraft(field="headline", value="Sarapan heula"),
                    IgTextFieldDraft(field="subline", value="Start strong"),
                    IgTextFieldDraft(field="productName", value="Dish 1"),
                    IgTextFieldDraft(field="caption", value="Order now."),
                ],
            )
        ]
    )
    merged = _merge_ig_format_with_texts(source_entries=source, picks=picks)
    assert len(merged) == 1
    row = merged[0]
    assert row["type"] == "post"
    assert row["formatRationale"] == "Static showcase fits the slot."
    assert row["texts"][0]["field"] == "headline"


def test_merge_ig_format_with_texts_rejects_unknown_slot_key() -> None:
    source = [_format_entry()]
    picks = IgTextPickOutput(
        entries=[
            IgTextEntryDraft(
                slotKey="unknown-slot",
                texts=[IgTextFieldDraft(field="caption", value="Copy")],
            )
        ]
    )
    with pytest.raises(ValueError, match="unknown slotKey"):
        _merge_ig_format_with_texts(source_entries=source, picks=picks)


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_prior_ig_format() -> None:
    client = MagicMock()
    state = {
        "location_id": 1,
        "user_id": "u1",
        "prior_milestones_data": "[]",
        "injected_prior_context_markdown": "Campaign brief orientation.",
        "milestone_input": {"type": "ig_text", "value": {"notes": ""}},
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_text.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
        pytest.raises(ValueError, match="prior ig_format"),
    ):
        await fetch_and_prepare(state, client=client)


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_campaign_brief_injection() -> None:
    client = MagicMock()
    state = {
        "location_id": 1,
        "user_id": "u1",
        "prior_milestones_data": _prior_milestones_json(include_brief=False),
        "injected_prior_context_markdown": "",
        "milestone_input": {"type": "ig_text", "value": {"notes": ""}},
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_text.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
        pytest.raises(ValueError, match="restaurant_campaign_brief"),
    ):
        await fetch_and_prepare(state, client=client)


@pytest.mark.asyncio
async def test_fetch_and_prepare_copies_all_ig_format_entries() -> None:
    client = MagicMock()
    payload = _valid_format_payload()
    payload["entries"] = [
        _format_entry(slot_key="monday-lunch"),
        _format_entry(slot_key="wednesday-afternoon"),
    ]
    state = {
        "location_id": 1,
        "user_id": "u1",
        "prior_milestones_data": _prior_milestones_json(payload=payload),
        "injected_prior_context_markdown": "Tone: warm and local.",
        "milestone_input": {"type": "ig_text", "value": {"notes": "Keep captions short"}},
        "goal": "Grow lunch",
    }
    with patch(
        "agents_app.agents.core.milestone_run.ig_text.nodes.get_stream_writer",
        return_value=lambda _payload: None,
    ):
        result = await fetch_and_prepare(state, client=client)

    assert len(result["source_ig_format_entries"]) == 2
    assert "Keep captions short" in result["generation_context_json"]
    assert result["source_campaign_brief_title"] == "Campaign Brief"


@pytest.mark.asyncio
async def test_generate_texts_with_llm_merges_picks_onto_format_rows() -> None:
    source_entry = _format_entry()
    picks = IgTextPickOutput(
        entries=[
            IgTextEntryDraft(
                slotKey="wednesday-afternoon",
                texts=[
                    IgTextFieldDraft(field="headline", value="Sarapan heula"),
                    IgTextFieldDraft(field="subline", value="Start strong"),
                    IgTextFieldDraft(field="productName", value="Dish 1"),
                    IgTextFieldDraft(field="caption", value="Order now."),
                ],
            )
        ]
    )
    state = {
        "goal": "",
        "prior_ig_format_data": _valid_format_payload(),
        "prior_ig_format_row": {"title": "IG Format"},
        "source_ig_format_entries": [source_entry],
        "injected_prior_context_markdown": "Tone: warm and local.",
        "source_campaign_brief_title": "Campaign Brief",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_text.nodes.structured_ainvoke_from_run_config",
            new_callable=AsyncMock,
            return_value=picks,
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_text.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        result = await generate_texts_with_llm(state)

    output = result["generated_output"]
    assert output["entries"][0]["texts"][0]["field"] == "headline"
    assert output["entries"][0]["type"] == "post"
    assert output["sourceIgFormatTitle"] == "IG Format"
    assert output["sourceCampaignBriefTitle"] == "Campaign Brief"


@pytest.mark.asyncio
async def test_persist_result_writes_eval_hints() -> None:
    client = MagicMock()
    generated = {
        "scheduleExplanation": "Push weak afternoon slots with hero content.",
        "entries": [{**_format_entry(), "texts": _post_texts()}],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": generated,
        "source_ig_format_entries": [_format_entry()],
        "prior_ig_format_row": {"title": "IG Format"},
        "source_campaign_brief_title": "Campaign Brief",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_text.nodes.upsert_milestonedata_node",
            new_callable=AsyncMock,
        ) as mock_upsert,
        patch(
            "agents_app.agents.core.milestone_run.ig_text.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        result = await persist_result(state, client=client)

    mock_upsert.assert_awaited_once()
    payload = mock_upsert.await_args.args[2]
    assert payload["_evalHints"]["hasPriorIgFormat"] is True
    assert result["milestonedata_written"] is True
