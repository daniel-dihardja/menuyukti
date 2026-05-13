"""Tests for dedicated menu-tagger graph path and helpers."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.menu_tagger.nodes import (
    compute_used_tags,
    fetch_and_prepare,
    flatten_promotion_candidates_items,
    merge_tagged_items,
    normalize_menu_tagger_tags,
    persist_result,
    _sanitize_menu_tagger_payload,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output


def _promotion_candidates_data() -> dict:
    return {
        "mainCategory": "Mains",
        "categories": [
            {
                "category": "Mains",
                "starItems": [{"name": "Nasi Goreng"}],
                "puzzleItems": [{"name": "Iced Tea"}],
            }
        ],
    }


def _prior_json() -> str:
    return json.dumps(
        [
            {
                "title": "Promotion picks",
                "presetId": "promotion_candidates",
                "data": _promotion_candidates_data(),
            }
        ]
    )


def _valid_menu_tagger_payload() -> dict:
    return {
        "taxonomyVersion": "v2",
        "sourcePromotionCandidatesTitle": "Promotion picks",
        "items": [
            {
                "name": "Nasi Goreng",
                "role": "star",
                "category": "Mains",
                "tags": {
                    "kind": "food",
                    "ingredient": ["rice"],
                    "taste": ["savory"],
                    "course": ["main"],
                    "reel_moment": "toss_stir",
                    "texture": ["juicy"],
                    "prep_style": ["fried"],
                    "occasion": ["dinner"],
                    "serve_temp": "hot",
                    "content_angle": ["signature"],
                },
            },
            {
                "name": "Iced Tea",
                "role": "puzzle",
                "category": "Mains",
                "tags": {
                    "kind": "drink",
                    "ingredient": ["tea"],
                    "taste": ["mild"],
                    "course": ["beverage"],
                    "reel_moment": "pour",
                    "texture": ["silky"],
                    "prep_style": ["blended"],
                    "occasion": ["lunch"],
                    "serve_temp": "cold",
                    "content_angle": [],
                },
            },
        ],
        "usedTags": {
            "kind": ["drink", "food"],
            "ingredient": ["rice", "tea"],
            "taste": ["mild", "savory"],
            "course": ["beverage", "main"],
            "reel_moment": ["pour", "toss_stir"],
            "texture": ["juicy", "silky"],
            "prep_style": ["blended", "fried"],
            "occasion": ["dinner", "lunch"],
            "serve_temp": ["cold", "hot"],
            "content_angle": ["signature"],
        },
    }


def test_flatten_promotion_candidates_items() -> None:
    items = flatten_promotion_candidates_items(_promotion_candidates_data())
    assert len(items) == 2
    assert items[0]["name"] == "Nasi Goreng"
    assert items[0]["role"] == "star"
    assert items[1]["name"] == "Iced Tea"
    assert items[1]["role"] == "puzzle"


def test_sanitize_menu_tagger_payload_filters_invalid_enums() -> None:
    payload = {
        "taxonomyVersion": "v2",
        "items": [
            {
                "name": "Nasi Goreng",
                "role": "star",
                "category": "Mains",
                "tags": {
                    "kind": "food",
                    "ingredient": ["rice", "invalid"],
                    "taste": ["savory"],
                    "course": ["main"],
                    "reel_moment": "invalid_hook",
                    "texture": [],
                    "prep_style": [],
                    "occasion": [],
                    "serve_temp": "hot",
                    "content_angle": [],
                },
            }
        ],
        "usedTags": {},
    }
    sanitized = _sanitize_menu_tagger_payload(payload)
    tags = sanitized["items"][0]["tags"]
    assert tags["reel_moment"] == "static_hero"
    assert tags["ingredient"] == ["rice"]


def test_normalize_menu_tagger_tags_filters_unknown_enums() -> None:
    tags = normalize_menu_tagger_tags(
        {
            "kind": "food",
            "ingredient": ["rice", "invalid", "rice"],
            "taste": ["savory"],
            "course": ["main", "main"],
            "reel_moment": "invalid_hook",
            "texture": ["crispy", "invalid"],
            "prep_style": ["grilled"],
            "occasion": ["dinner", "invalid"],
            "serve_temp": "not_a_temp",
            "content_angle": ["signature", "invalid"],
        }
    )
    assert tags == {
        "kind": "food",
        "ingredient": ["rice"],
        "taste": ["savory"],
        "course": ["main"],
        "reel_moment": "static_hero",
        "texture": ["crispy"],
        "prep_style": ["grilled"],
        "occasion": ["dinner"],
        "serve_temp": "room_temp",
        "content_angle": ["signature"],
    }


def test_normalize_menu_tagger_tags_applies_defaults_when_missing() -> None:
    tags = normalize_menu_tagger_tags(None)
    assert tags["kind"] == "other"
    assert tags["reel_moment"] == "static_hero"
    assert tags["serve_temp"] == "room_temp"


def test_merge_tagged_items_preserves_input_order() -> None:
    input_items = flatten_promotion_candidates_items(_promotion_candidates_data())
    merged = merge_tagged_items(
        input_items,
        [
            {
                "name": "Iced Tea",
                "role": "puzzle",
                "category": "Mains",
                "tags": {
                    "kind": "drink",
                    "ingredient": ["tea"],
                    "taste": ["mild"],
                    "course": ["beverage"],
                    "reel_moment": "pour",
                    "texture": [],
                    "prep_style": [],
                    "occasion": [],
                    "serve_temp": "cold",
                    "content_angle": [],
                },
            },
            {
                "name": "Nasi Goreng",
                "role": "star",
                "category": "Mains",
                "tags": {
                    "kind": "food",
                    "ingredient": ["rice"],
                    "taste": ["savory"],
                    "course": ["main"],
                    "reel_moment": "toss_stir",
                    "texture": [],
                    "prep_style": [],
                    "occasion": [],
                    "serve_temp": "hot",
                    "content_angle": [],
                },
            },
        ],
    )
    assert merged[0]["name"] == "Nasi Goreng"
    assert merged[0]["tags"]["kind"] == "food"
    assert merged[1]["tags"]["kind"] == "drink"


def test_compute_used_tags_rollup() -> None:
    items = merge_tagged_items(
        flatten_promotion_candidates_items(_promotion_candidates_data()),
        _valid_menu_tagger_payload()["items"],
    )
    used = compute_used_tags(items)
    assert used["kind"] == ["drink", "food"]
    assert used["ingredient"] == ["rice", "tea"]


def test_validate_skill_output_menu_tagger() -> None:
    normalized, error = validate_skill_output("menu_tagger", _valid_menu_tagger_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["taxonomyVersion"] == "v2"


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_prior_promotion_candidates() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Tag items",
        "criteria": [],
        "prior_milestones_data": "[]",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.menu_tagger.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="prior promotion_candidates"),
    ):
        await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))


@pytest.mark.asyncio
async def test_fetch_and_prepare_flattens_prior_items() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Tag items",
        "criteria": [],
        "prior_milestones_data": _prior_json(),
    }
    with patch(
        "agents_app.agents.core.milestone_run.menu_tagger.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))

    assert len(out["input_items"]) == 2
    assert out["source_promotion_candidates_title"] == "Promotion picks"
    assert "Nasi Goreng" in out["generation_context_markdown"]


@pytest.mark.asyncio
async def test_persist_result_upserts_valid_payload() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": _valid_menu_tagger_payload(),
    }
    with patch(
        "agents_app.agents.core.milestone_run.menu_tagger.nodes.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-1"}),
    ) as mock_upsert:
        out = await persist_result(state, client=MagicMock(spec=AsyncMock))

    assert out["milestonedata_written"] is True
    assert isinstance(out["milestone_data"], dict)
    assert out["milestone_data"]["taxonomyVersion"] == "v2"
    saved = mock_upsert.await_args.args[2]
    assert saved["usedTags"]["kind"] == ["drink", "food"]
