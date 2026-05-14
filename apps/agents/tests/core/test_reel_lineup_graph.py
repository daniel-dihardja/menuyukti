"""Tests for reel_lineup clustering and graph nodes."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.reel_lineup.cluster import build_reel_lineup
from agents_app.agents.core.milestone_run.reel_lineup.nodes import (
    build_lineup,
    fetch_and_prepare,
    persist_result,
)


def _menu_tagger_items() -> list[dict]:
    shared_tags = {
        "kind": "food",
        "ingredient": ["meat"],
        "taste": ["savory"],
        "course": ["main"],
        "reel_moment": "sizzle",
        "texture": ["juicy"],
        "prep_style": ["grilled"],
        "occasion": ["dinner"],
        "serve_temp": "hot",
        "content_angle": [],
    }
    return [
        {
            "name": "Ribeye",
            "role": "star",
            "category": "MAINS",
            "tags": shared_tags,
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "tags": {**shared_tags, "ingredient": ["bread"]},
        },
        {
            "name": "Wings",
            "role": "puzzle",
            "category": "MAINS",
            "tags": {**shared_tags, "ingredient": ["poultry"]},
        },
        {
            "name": "Salad",
            "role": "puzzle",
            "category": "MAINS",
            "tags": {
                **shared_tags,
                "ingredient": ["vegetable"],
                "content_angle": ["hidden_gem"],
            },
        },
    ]


def _promotion_candidates() -> dict:
    return {
        "mainCategory": "MAINS",
        "categories": [
            {
                "category": "MAINS",
                "starItems": [
                    {
                        "name": "Ribeye",
                        "storytellingFit": "strong",
                        "storytellingRationale": "",
                        "popularity": 0.9,
                        "priceLevel": 3,
                    },
                    {
                        "name": "Burger",
                        "storytellingFit": "weak",
                        "storytellingRationale": "",
                        "popularity": 0.7,
                        "priceLevel": 2,
                    },
                ],
                "puzzleItems": [
                    {
                        "name": "Wings",
                        "storytellingFit": "weak",
                        "storytellingRationale": "",
                        "popularity": 0.4,
                        "priceLevel": 2,
                    },
                    {
                        "name": "Salad",
                        "storytellingFit": "strong",
                        "storytellingRationale": "",
                        "popularity": 0.3,
                        "priceLevel": 1,
                    },
                ],
            }
        ],
    }


def _drink_tags() -> dict:
    return {
        "kind": "drink",
        "ingredient": ["coffee"],
        "taste": ["bitter"],
        "course": ["beverage"],
        "reel_moment": "pour",
        "texture": ["silky"],
        "prep_style": ["blended"],
        "occasion": ["dinner"],
        "serve_temp": "cold",
        "content_angle": [],
    }


def _menu_tagger_items_with_drink() -> list[dict]:
    items = _menu_tagger_items()
    items.append(
        {
            "name": "Cola",
            "role": "star",
            "category": "DRINK",
            "tags": _drink_tags(),
        }
    )
    return items


def _promotion_candidates_with_drink() -> dict:
    payload = _promotion_candidates()
    payload["categories"].append(
        {
            "category": "DRINK",
            "starItems": [
                {
                    "name": "Cola",
                    "storytellingFit": "weak",
                    "storytellingRationale": "",
                    "popularity": 0.8,
                    "priceLevel": 1,
                }
            ],
            "puzzleItems": [],
        }
    )
    return payload


def test_build_reel_lineup_creates_valid_groups() -> None:
    payload = build_reel_lineup(
        menu_tagger_items=_menu_tagger_items(),
        promotion_candidates=_promotion_candidates(),
    )
    normalized, error = validate_skill_output("reel_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["groups"]
    first = normalized["groups"][0]
    assert first["items"][0]["role"] == "star"
    assert first["leadName"] == first["items"][0]["name"]


def test_build_reel_lineup_appends_drink_last() -> None:
    payload = build_reel_lineup(
        menu_tagger_items=_menu_tagger_items_with_drink(),
        promotion_candidates=_promotion_candidates_with_drink(),
    )
    normalized, error = validate_skill_output("reel_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["groups"]
    first = normalized["groups"][0]
    assert first["items"][-1]["category"] == "DRINK"
    assert first["items"][-1]["reelMoment"] == "pour"


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_menu_tagger() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.reel_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="menu_tagger"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": "[]",
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )


@pytest.mark.asyncio
async def test_build_lineup_and_persist() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "menu_tagger_items": _menu_tagger_items(),
        "promotion_candidates_data": _promotion_candidates(),
        "source_menu_tagger_title": "Tagged menu",
        "owner_notes_markdown": "",
        "result_data": "",
        "milestonedata_written": False,
    }
    built = await build_lineup(state)  # type: ignore[arg-type]
    assert built["generated_output"]["groups"]

    with patch(
        "agents_app.agents.core.milestone_run.reel_lineup.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        saved = await persist_result({**state, **built}, client=MagicMock())  # type: ignore[arg-type]
        upsert.assert_awaited_once()
    assert saved["milestonedata_written"] is True
