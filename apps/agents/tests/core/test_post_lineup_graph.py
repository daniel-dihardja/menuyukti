"""Tests for post_lineup build and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup
from agents_app.agents.core.milestone_run.post_lineup.nodes import (
    build_posts,
    fetch_and_prepare,
    persist_result,
)


def _food_leads() -> list[dict]:
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
            "storytellingFit": "strong",
            "tags": shared_tags,
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "tags": {**shared_tags, "ingredient": ["bread"]},
        },
    ]


def test_build_post_lineup_creates_carousel_from_food_leads() -> None:
    payload = build_post_lineup(food_leads=_food_leads(), source_reel_lineup_title="Reel lineup")
    normalized, error = validate_skill_output("post_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["posts"]) == 1
    post = normalized["posts"][0]
    assert post["format"] == "carousel"
    assert post["intent"] == "pinned_monthly_menu"
    assert len(post["slides"]) == 2
    assert post["slides"][0]["dishName"] == "Ribeye"
    assert post["slides"][0]["imageBrief"]
    assert normalized["sourceReelLineupTitle"] == "Reel lineup"


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_reel_lineup() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="reel_lineup"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": "[]",
            },
            client=AsyncMock(),
        )


@pytest.mark.asyncio
async def test_build_posts_and_persist_result() -> None:
    prior = json.dumps(
        [
            {
                "title": "Reel lineup",
                "presetId": "reel_lineup",
                "data": {"foodLeads": _food_leads(), "groups": [], "unassignedItemNames": []},
            }
        ]
    )
    with patch(
        "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        prepared = await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": prior,
            },
            client=AsyncMock(),
        )
    built = await build_posts(
        {
            "milestone_id": "m1",
            "location_id": 1,
            "user_id": "u1",
            "goal": "",
            "criteria": [],
            "food_leads": prepared["food_leads"],
            "source_reel_lineup_title": prepared["source_reel_lineup_title"],
        }
    )
    client = AsyncMock()
    with patch(
        "agents_app.agents.core.milestone_run.post_lineup.nodes.upsert_milestonedata_node",
        new_callable=AsyncMock,
    ) as upsert:
        result = await persist_result(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "generated_output": built["generated_output"],
            },
            client=client,
        )
    upsert.assert_awaited_once()
    assert result["milestonedata_written"] is True
    assert len(json.loads(result["result_data"])["posts"]) == 1
