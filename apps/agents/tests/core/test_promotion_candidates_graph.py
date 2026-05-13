"""Tests for promotion-candidates graph nodes."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.promotion_candidates.nodes import (
    StorytellingVerdictLine,
    StorytellingVerdictsOutput,
    enrich_storytelling,
    fetch_and_prepare,
    persist_result,
)

_MINIMAL_BRIEF_INJECTION = (
    "## Prior milestone context (injected)\n\n"
    '```json\n[{"presetId": "restaurant_campaign_brief", "data": {}}]\n```'
)


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_injected_campaign_brief() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "injected_prior_context_markdown": "",
    }
    with pytest.raises(ValueError, match="restaurant_campaign_brief"):
        await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))


@pytest.mark.asyncio
async def test_fetch_and_prepare_builds_pos_category_sections() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "prior_milestones_data": (
            '[{"presetId":"restaurant_campaign_brief","data":{"mainCategory":"Drinks"}}]'
        ),
        "injected_prior_context_markdown": _MINIMAL_BRIEF_INJECTION,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.fetch_promotion_engineering_candidates",
            new=AsyncMock(
                return_value={
                    "grouping": "by_menu_category",
                    "categories": {
                        "Mains": {
                            "starItems": ["Steak", "Pasta"],
                            "puzzleItems": ["Soup"],
                        },
                        "Drinks": {
                            "starItems": ["Latte"],
                            "puzzleItems": ["Matcha"],
                        },
                    },
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))

    categories = out["formatted_output"]["categories"]
    assert [row["category"] for row in categories] == ["Drinks", "Mains"]
    assert categories[0]["starItems"][0]["name"] == "Latte"
    assert categories[0]["starItems"][0]["storytellingFit"] == "weak"


@pytest.mark.asyncio
async def test_fetch_and_prepare_orders_main_category_before_alphabetical() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "prior_milestones_data": (
            '[{"presetId":"restaurant_campaign_brief","data":{"mainCategory":"Cocktails"}}]'
        ),
        "injected_prior_context_markdown": _MINIMAL_BRIEF_INJECTION,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.fetch_promotion_engineering_candidates",
            new=AsyncMock(
                return_value={
                    "grouping": "by_menu_category",
                    "categories": {
                        "Appetizers": {"starItems": ["Bruschetta"], "puzzleItems": []},
                        "Cocktails": {"starItems": ["Negroni"], "puzzleItems": []},
                        "Mains": {"starItems": ["Steak"], "puzzleItems": []},
                    },
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))

    assert [row["category"] for row in out["formatted_output"]["categories"]] == [
        "Cocktails",
        "Appetizers",
        "Mains",
    ]


@pytest.mark.asyncio
async def test_fetch_and_prepare_filters_selected_menu_categories() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "prior_milestones_data": (
            '[{"presetId":"restaurant_campaign_brief","data":{"mainCategory":"Mains"}}]'
        ),
        "injected_prior_context_markdown": _MINIMAL_BRIEF_INJECTION,
        "milestone_input": {
            "type": "promotion_candidates",
            "value": {"notes": "", "selectedMenuCategories": ["Mains"]},
        },
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.fetch_promotion_engineering_candidates",
            new=AsyncMock(
                return_value={
                    "grouping": "by_menu_category",
                    "categories": {
                        "Mains": {"starItems": ["Steak"], "puzzleItems": []},
                        "Desserts": {"starItems": ["Cake"], "puzzleItems": []},
                    },
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))

    categories = out["formatted_output"]["categories"]
    assert len(categories) == 1
    assert categories[0]["category"] == "Mains"


@pytest.mark.asyncio
async def test_fetch_and_prepare_passes_item_limits_to_graphql() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "prior_milestones_data": (
            '[{"presetId":"restaurant_campaign_brief","data":{"mainCategory":"Mains"}}]'
        ),
        "injected_prior_context_markdown": _MINIMAL_BRIEF_INJECTION,
        "milestone_input": {
            "type": "promotion_candidates",
            "value": {
                "notes": "",
                "selectedMenuCategories": [],
                "starItemLimit": 10,
                "puzzleItemLimit": "all",
            },
        },
    }
    fetch_mock = AsyncMock(
        return_value={
            "grouping": "flat",
            "starItems": ["A"],
            "puzzleItems": ["B"],
        }
    )
    with (
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.fetch_promotion_engineering_candidates",
            new=fetch_mock,
        ),
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))

    fetch_mock.assert_awaited_once()
    assert fetch_mock.await_args.kwargs["max_star_items"] == 10
    assert fetch_mock.await_args.kwargs["max_puzzle_items"] == 0


@pytest.mark.asyncio
async def test_enrich_storytelling_applies_llm_verdicts() -> None:
    state: dict = {
        "goal": "Promote signature dishes",
        "criteria": [],
        "run_id": "r1",
        "injected_prior_context_markdown": _MINIMAL_BRIEF_INJECTION,
        "formatted_output": {
            "mainCategory": "Mains",
            "categories": [
                {
                    "category": "Mains",
                    "starItems": [
                        {"name": "Steak", "storytellingFit": "weak", "storytellingRationale": ""}
                    ],
                    "puzzleItems": [],
                },
                {"category": "Desserts", "starItems": [], "puzzleItems": []},
            ],
            "sourceAnalyticsRunId": None,
            "notes": "",
        },
    }
    verdict = StorytellingVerdictsOutput(
        verdicts=[
            StorytellingVerdictLine(
                name="Steak",
                storytellingFit="strong",
                storytellingRationale="Bold name fits the hero narrative.",
            )
        ]
    )
    structured = MagicMock()
    structured.ainvoke = AsyncMock(return_value=verdict)
    base_llm = MagicMock()
    base_llm.with_structured_output.return_value = structured
    with (
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.structured_llm_from_milestone_run_config",
            return_value=base_llm,
        ),
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await enrich_storytelling(state)

    star = out["formatted_output"]["categories"][0]["starItems"][0]
    assert star["name"] == "Steak"
    assert star["storytellingFit"] == "strong"
    assert "hero" in star["storytellingRationale"].lower()


@pytest.mark.asyncio
async def test_persist_result_writes_valid_payload() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "formatted_output": {
            "mainCategory": "Mains",
            "categories": [
                {"category": "Mains", "starItems": ["Steak"], "puzzleItems": ["Soup"]},
                {"category": "Drinks", "starItems": ["Latte"], "puzzleItems": ["Matcha"]},
            ],
            "sourceAnalyticsRunId": None,
            "notes": "",
        },
    }
    with patch(
        "agents_app.agents.core.milestone_run.promotion_candidates.nodes.upsert_milestonedata_node",
        new=AsyncMock(return_value={}),
    ) as mock_upsert:
        out = await persist_result(state, client=MagicMock(spec=AsyncMock))

    mock_upsert.assert_awaited_once()
    assert out["milestonedata_written"] is True
    assert isinstance(out["milestone_data"], dict)
    saved = mock_upsert.await_args.args[2]
    assert saved["categories"][0]["starItems"][0]["name"] == "Steak"
    assert saved["categories"][0]["starItems"][0]["storytellingFit"] == "strong"


@pytest.mark.asyncio
async def test_persist_result_accepts_object_shaped_items() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "formatted_output": {
            "mainCategory": "Mains",
            "categories": [
                {
                    "category": "Mains",
                    "starItems": [
                        {
                            "name": "Steak",
                            "storytellingFit": "weak",
                            "storytellingRationale": "Generic for this brief.",
                        }
                    ],
                    "puzzleItems": [],
                },
                {"category": "Drinks", "starItems": [], "puzzleItems": []},
            ],
            "sourceAnalyticsRunId": None,
            "notes": "",
        },
    }
    with patch(
        "agents_app.agents.core.milestone_run.promotion_candidates.nodes.upsert_milestonedata_node",
        new=AsyncMock(return_value={}),
    ) as mock_upsert:
        await persist_result(state, client=MagicMock(spec=AsyncMock))
    saved = mock_upsert.await_args.args[2]
    assert saved["categories"][0]["starItems"][0]["storytellingRationale"] == "Generic for this brief."


def test_validate_skill_output_accepts_large_star_item_lists() -> None:
    stars = [{"name": f"Dish {i}", "storytellingFit": "weak", "storytellingRationale": ""} for i in range(25)]
    normalized, error = validate_skill_output(
        "promotion_candidates",
        {
            "mainCategory": "Mains",
            "categories": [{"category": "Mains", "starItems": stars, "puzzleItems": []}],
            "sourceAnalyticsRunId": None,
            "notes": "",
        },
    )
    assert error is None
    assert normalized is not None
    assert len(normalized["categories"][0]["starItems"]) == 25
