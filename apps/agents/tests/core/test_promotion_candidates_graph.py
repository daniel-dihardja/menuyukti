"""Tests for promotion-candidates deterministic graph nodes."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.promotion_candidates.nodes import (
    fetch_and_prepare,
    persist_result,
)


@pytest.mark.asyncio
async def test_fetch_and_prepare_orders_categories_by_campaign_brief_main_category() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "prior_milestones_data": (
            '[{"presetId":"restaurant_campaign_brief","data":{"mainCategory":"DRINK"}}]'
        ),
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.promotion_candidates.nodes.fetch_promotion_engineering_candidates",
            new=AsyncMock(
                return_value={
                    "grouping": "by_menu_category",
                    "categories": {
                        "FOOD": {
                            "starItems": ["Steak", "Pasta"],
                            "puzzleItems": ["Soup"],
                        },
                        "DRINK": {
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
    assert categories[0]["category"] == "DRINK"
    assert categories[1]["category"] == "FOOD"


@pytest.mark.asyncio
async def test_persist_result_writes_valid_payload() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "formatted_output": {
            "mainCategory": "FOOD",
            "categories": [
                {"category": "FOOD", "starItems": ["Steak"], "puzzleItems": ["Soup"]},
                {"category": "DRINK", "starItems": ["Latte"], "puzzleItems": ["Matcha"]},
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
