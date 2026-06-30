"""Tests for post_lineup build, merge, and graph nodes."""

from __future__ import annotations

import json
import json
from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup_output
from agents_app.agents.core.milestone_run.post_lineup.nodes import (
    fetch_and_prepare,
    finalize_output,
    persist_result,
)
from agents_app.agents.core.milestone_run.post_lineup.top_five import (
    PostLineupTopFiveDraft,
    TopFivePostDraft,
    TopFiveSlideDraft,
    build_top_five_posts_from_draft,
    prepare_top_five_categories,
    validate_top_five_drafts,
)

START_DATE = "2026-06-01"
END_DATE = "2026-06-30"


def _menu_tagger_items() -> list[dict]:
    shared_tags = {
        "kind": "food",
        "ingredient": ["meat"],
        "taste": ["savory"],
        "course": ["main"],
        "reel_moment": "static_hero",
        "texture": ["juicy"],
        "prep_style": ["grilled"],
        "occasion": ["dinner"],
        "serve_temp": "hot",
        "content_angle": [],
    }
    side_tags = {**shared_tags, "course": ["side"]}
    return [
        {
            "name": "Ribeye",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.09,
            "tags": shared_tags,
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.09,
            "tags": {**shared_tags, "reel_moment": "stack"},
        },
        {
            "name": "Wings",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.05,
            "tags": shared_tags,
        },
        {
            "name": "Pasta",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.04,
            "tags": shared_tags,
        },
        {
            "name": "Steak",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.04,
            "tags": shared_tags,
        },
        {
            "name": "Fries",
            "role": "puzzle",
            "category": "SIDES",
            "storytellingFit": "weak",
            "popularity": 0.5,
            "tags": side_tags,
        },
    ]


def _campaign_brief_data() -> dict:
    return {
        "venueSnapshot": {
            "venueName": "Cafe Alto",
            "city": "Berlin",
            "country": "Germany",
            "currency": "EUR",
        },
        "overallStrategy": {
            "strategyFocus": "weekday_lunch",
            "offerWindow": "11:00-14:00",
        },
        "contentPillars": ["Hero signatures", "Category variety", "Behind-the-scenes craft"],
        "audienceHypotheses": ["Lunch workers", "Weekend families", "Evening diners"],
        "proofOrientedAngles": ["Top sellers", "Weekend mix", "Meal-period demand"],
        "toneGuardrails": ["Be specific", "Keep copy concise", "Use operational language"],
        "campaignObjective": "Increase reservations",
        "mainCategory": "Mains",
    }


def _prior_json() -> str:
    return json.dumps(
        [
            {
                "title": "Campaign dates",
                "presetId": "dates",
                "data": {
                    "startDate": START_DATE,
                    "endDate": END_DATE,
                    "publicHolidays": [],
                },
            },
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": _campaign_brief_data(),
            },
            {
                "title": "Menu tagger",
                "presetId": "menu_tagger",
                "data": {
                    "taxonomyVersion": "v2",
                    "items": _menu_tagger_items(),
                    "usedTags": {},
                },
            },
        ]
    )


def _top_five_posts() -> list[dict]:
    menu_tagger_data = {"items": _menu_tagger_items()}
    brief = _campaign_brief_data()
    categories = prepare_top_five_categories(menu_tagger_data, brief)
    drafts = [
        {
            "category": row["category"],
            "title": f"Top 5 {row['category']}",
            "slides": [
                {"dishName": item["name"], "caption": f"Caption for {item['name']}."}
                for item in row["signatureItems"]
            ],
        }
        for row in categories
    ]
    return build_top_five_posts_from_draft(drafts, category_payloads=categories)


def test_build_post_lineup_output_creates_top_five_posts_only() -> None:
    top_five_posts = _top_five_posts()
    payload = build_post_lineup_output(
        top_five_posts=top_five_posts,
        start_date=START_DATE,
        end_date=END_DATE,
        source_menu_tagger_title="Menu tagger",
        source_campaign_brief_title="Campaign brief",
        source_dates_title="Campaign dates",
    )
    normalized, error = validate_skill_output("post_lineup", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["posts"]) == len(top_five_posts)
    assert all(post["intent"] == "top_five_category" for post in normalized["posts"])
    mains = next(post for post in normalized["posts"] if post["category"] == "MAINS")
    assert len(mains["slides"]) <= 5
    assert all(slide.get("caption") for slide in mains["slides"])


def test_top_five_posts_cap_at_five_items_per_category() -> None:
    top_five_posts = _top_five_posts()
    mains = next(post for post in top_five_posts if post["category"] == "MAINS")
    assert len(mains["slides"]) <= 5
    assert "Wings" not in {slide["dishName"] for slide in mains["slides"]}


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_dates_milestone() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.post_lineup.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="dates"),
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
async def test_fetch_and_prepare_loads_dates_tagger_and_brief() -> None:
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
                "prior_milestones_data": _prior_json(),
            },
            client=AsyncMock(),
        )
    assert prepared["start_date"] == START_DATE
    assert prepared["end_date"] == END_DATE
    assert prepared["source_campaign_brief_title"] == "Campaign brief"
    assert prepared["source_menu_tagger_title"] == "Menu tagger"
    assert prepared["source_dates_title"] == "Campaign dates"
    assert len(prepared["top_five_categories"]) >= 1
    assert "groups" not in prepared


@pytest.mark.asyncio
async def test_finalize_output_persists_top_five_only() -> None:
    top_five_posts = _top_five_posts()
    built = await finalize_output(
        {
            "start_date": START_DATE,
            "end_date": END_DATE,
            "top_five_posts": top_five_posts,
            "source_menu_tagger_title": "Menu tagger",
            "source_campaign_brief_title": "Campaign brief",
            "source_dates_title": "Campaign dates",
        }
    )
    assert len(built["generated_output"]["posts"]) == len(top_five_posts)

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


def test_top_five_draft_coerces_string_slides() -> None:
    draft = PostLineupTopFiveDraft.model_validate(
        {
            "posts": [
                {
                    "category": "BEVERAGES",
                    "title": "Top 5 BEVERAGES",
                    "slides": ["Es Kopi Susu Aren", "Ice Americano"],
                }
            ]
        }
    )
    assert draft.posts[0].slides[0].dishName == "Es Kopi Susu Aren"
    assert draft.posts[0].slides[0].caption.strip()
    assert draft.posts[0].slides[1].dishName == "Ice Americano"


def test_top_five_draft_coerces_json_string_slides() -> None:
    slide_json = json.dumps(
        {
            "dishName": "Es Kopi Susu Aren",
            "caption": "Creamy palm-sugar coffee.",
        }
    )
    draft = PostLineupTopFiveDraft.model_validate(
        {
            "posts": [
                {
                    "category": "BEVERAGES",
                    "title": "Top 5 BEVERAGES",
                    "slides": [slide_json],
                }
            ]
        }
    )
    assert draft.posts[0].slides[0].dishName == "Es Kopi Susu Aren"
    assert "palm-sugar" in draft.posts[0].slides[0].caption


def test_validate_top_five_drafts_resolves_json_embedded_dish_name() -> None:
    category_payloads = [
        {
            "category": "BEVERAGES",
            "signatureItems": [{"name": "Es Kopi Susu Aren", "position": 1}],
            "starItems": [
                {
                    "name": "Es Kopi Susu Aren",
                    "role": "star",
                    "category": "BEVERAGES",
                    "tags": {"kind": "food", "course": ["drink"]},
                }
            ],
        }
    ]
    slide_json = json.dumps(
        {
            "dishName": "Es Kopi Susu Aren",
            "caption": "Creamy palm-sugar coffee.",
        }
    )
    drafts = [
        TopFivePostDraft(
            category="BEVERAGES",
            title="Top 5 BEVERAGES",
            slides=[TopFiveSlideDraft(dishName=slide_json, caption="Fallback caption.")],
        )
    ]
    normalized = validate_top_five_drafts(
        drafts,
        expected_categories={"BEVERAGES"},
        category_payloads=category_payloads,
    )
    assert normalized[0]["slides"][0]["dishName"] == "Es Kopi Susu Aren"
