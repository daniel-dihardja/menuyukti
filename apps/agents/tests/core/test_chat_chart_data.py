"""Tests for chat chart data formatting and loaders."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.chat.chart_data import (
    derive_daily_heatmap_hour_range,
    filter_heatmaps_for_chat,
    find_day_specialties,
    format_chart_markdown_section,
    format_daily_highlights,
    format_day_specialties,
    format_menu_heatmap_summary,
    format_pair_lift_matrix,
    format_slot_demand_profile,
    load_chart_data_markdown,
    weekday_quantity,
)


def test_format_slot_demand_profile_empty() -> None:
    assert format_slot_demand_profile([]) == "(no slot demand data)"


def test_format_slot_demand_profile_cells() -> None:
    out = format_slot_demand_profile(
        [
            {
                "day": "Mon",
                "mealPeriodLabel": "Lunch",
                "mealPeriodHoursLabel": "11:00-14:00",
                "orderCount": 12,
                "demandIndex": 1.5,
                "relativeDemand": "high",
            }
        ]
    )
    assert "**Mon / Lunch**" in out
    assert "12 orders" in out
    assert "demand index 1.50" in out
    assert "high demand" in out


def test_format_pair_lift_matrix_insufficient() -> None:
    assert format_pair_lift_matrix({"focusMenus": ["A"]}) == (
        "(not enough focus menu items for a lift matrix)"
    )


def test_format_pair_lift_matrix_table() -> None:
    out = format_pair_lift_matrix(
        {
            "focusMenus": ["Burger", "Fries"],
            "matrixLift": [[None, 1.25], [1.25, None]],
            "totalOrders": 100,
            "multiItemOrderCount": 40,
            "scope": "top pairs",
        }
    )
    assert "**Total Orders:** 100" in out
    assert "| Menu | Burger | Fries |" in out
    assert "1.25" in out


def test_format_menu_heatmap_summary_top_n_and_peaks() -> None:
    items = [
        {
            "menu": f"Item {i}",
            "menuCategory": "Mains",
            "weeklyHeatmap": [{"day": "Sat", "quantity": 100 - i}],
            "dailyHeatmap": [{"hour": 12, "quantity": 10}],
        }
        for i in range(30)
    ]
    out = format_menu_heatmap_summary(items, daily_start_hour=9, daily_end_hour=21)
    assert "**Daily hour range:** 9:00–21:00" in out
    assert "**1. Item 0**" in out
    assert "Showing top 25 of 30" in out
    assert "peak day Sat" in out


def test_filter_heatmaps_for_chat_keeps_star_plow_puzzle() -> None:
    heatmaps = [
        {"menu": "Steak", "weeklyHeatmap": [], "dailyHeatmap": []},
        {"menu": "Burger", "weeklyHeatmap": [], "dailyHeatmap": []},
        {"menu": "Dog", "weeklyHeatmap": [], "dailyHeatmap": []},
        {"menu": "Soup", "weeklyHeatmap": [], "dailyHeatmap": []},
    ]
    matrix = [
        {"menu": "Steak", "category": "star"},
        {"menu": "Burger", "category": "plow_horse"},
        {"menu": "Soup", "category": "puzzle"},
        {"menu": "Dog", "category": "low_end"},
    ]
    filtered, by_menu, applied = filter_heatmaps_for_chat(heatmaps, matrix)
    assert applied is True
    assert [h["menu"] for h in filtered] == ["Steak", "Burger", "Soup"]
    assert by_menu["Steak"] == "star"
    assert "Dog" not in {h["menu"] for h in filtered}


def test_filter_heatmaps_for_chat_noop_without_matrix() -> None:
    heatmaps = [{"menu": "Steak", "weeklyHeatmap": [], "dailyHeatmap": []}]
    filtered, by_menu, applied = filter_heatmaps_for_chat(heatmaps, None)
    assert applied is False
    assert filtered == heatmaps
    assert by_menu == {}


def test_format_menu_heatmap_summary_includes_matrix_filter_note() -> None:
    out = format_menu_heatmap_summary(
        [
            {
                "menu": "Steak",
                "menuCategory": "Mains",
                "weeklyHeatmap": [{"day": "Fri", "quantity": 5}],
                "dailyHeatmap": [{"hour": 19, "quantity": 2}],
            }
        ],
        matrix_category_by_menu_map={"Steak": "star"},
        matrix_filter_applied=True,
    )
    assert "Filtered to star, plow horse, and puzzle" in out
    assert "(Mains, star)" in out


def test_weekday_quantity_normalizes_day_keys() -> None:
    item = {
        "menu": "Choipan",
        "weeklyHeatmap": [{"day": "Thursday", "quantity": 42}],
    }
    assert weekday_quantity(item, "thu") == 42
    assert weekday_quantity(item, "Thu") == 42
    assert weekday_quantity(item, "fri") == 0


def test_format_daily_highlights_empty_when_no_qty() -> None:
    assert format_daily_highlights([{"menu": "A", "weeklyHeatmap": []}]) == ""
    assert format_daily_highlights([]) == ""


def test_format_daily_highlights_top_n_and_skips_empty_days() -> None:
    heatmaps = [
        {"menu": f"Dish {i}", "weeklyHeatmap": [{"day": "mon", "quantity": 10 - i}]}
        for i in range(5)
    ]
    heatmaps.append({"menu": "OnlyTue", "weeklyHeatmap": [{"day": "tue", "quantity": 3}]})
    out = format_daily_highlights(heatmaps, top_n=3)
    assert "### Daily highlights" in out
    assert "**mon:** Dish 0 (10 units), Dish 1 (9 units), Dish 2 (8 units)" in out
    assert "Dish 3" not in out.split("**mon:**")[1].split("\n")[0]
    assert "**tue:** OnlyTue (3 units)" in out
    assert "**wed:**" not in out


def test_format_menu_heatmap_summary_daily_highlights_includes_filtered_low_end() -> None:
    """Thursday-only low_end specialty appears in Daily highlights, not the BCG main list."""
    steak = {
        "menu": "Steak",
        "menuCategory": "Mains",
        "weeklyHeatmap": [
            {"day": "mon", "quantity": 20},
            {"day": "thu", "quantity": 5},
        ],
        "dailyHeatmap": [{"hour": 19, "quantity": 8}],
    }
    choipan = {
        "menu": "Choipan",
        "menuCategory": "Specials",
        "weeklyHeatmap": [{"day": "Thu", "quantity": 42}],
        "dailyHeatmap": [{"hour": 12, "quantity": 42}],
    }
    all_items = [steak, choipan]
    matrix = [
        {"menu": "Steak", "category": "star"},
        {"menu": "Choipan", "category": "low_end"},
    ]
    filtered, by_menu, applied = filter_heatmaps_for_chat(all_items, matrix)
    assert applied is True
    assert [h["menu"] for h in filtered] == ["Steak"]

    out = format_menu_heatmap_summary(
        filtered,
        matrix_category_by_menu_map=by_menu,
        matrix_filter_applied=True,
        all_heatmaps_for_daily_highlights=all_items,
    )
    assert "**1. Steak**" in out
    assert "Choipan" not in out.split("### Daily highlights")[0]
    assert "### Daily highlights" in out
    assert "**thu:** Choipan (low_end, 42 units)" in out
    assert "### Day specialties" in out
    assert "**Choipan** (low_end): thu, 42 units (100% of weekly)" in out


def test_find_day_specialties_thresholds() -> None:
    below_share = {
        "menu": "Spread",
        "weeklyHeatmap": [
            {"day": "mon", "quantity": 6},
            {"day": "tue", "quantity": 4},
        ],
    }
    below_units = {
        "menu": "Tiny",
        "weeklyHeatmap": [{"day": "wed", "quantity": 5}],
    }
    ok = {
        "menu": "Choipan",
        "weeklyHeatmap": [{"day": "thu", "quantity": 42}],
    }
    found = find_day_specialties([below_share, below_units, ok])
    assert [row["menu"] for row in found] == ["Choipan"]
    assert found[0]["day"] == "thu"
    assert found[0]["units"] == 42
    assert found[0]["share"] == 1.0


def test_format_daily_highlights_appends_specialty_outside_top_n() -> None:
    heatmaps = [
        {"menu": "A", "weeklyHeatmap": [{"day": "thu", "quantity": 100}]},
        {"menu": "B", "weeklyHeatmap": [{"day": "thu", "quantity": 90}]},
        {"menu": "C", "weeklyHeatmap": [{"day": "thu", "quantity": 80}]},
        {"menu": "Choipan", "weeklyHeatmap": [{"day": "thu", "quantity": 42}]},
    ]
    specialties = find_day_specialties(heatmaps)
    out = format_daily_highlights(
        heatmaps,
        {"Choipan": "low_end"},
        top_n=3,
        specialties=specialties,
    )
    thu_line = out.split("**thu:**")[1].split("\n")[0]
    assert "A (100 units)" in thu_line
    assert "B (90 units)" in thu_line
    assert "C (80 units)" in thu_line
    assert "Choipan (low_end, 42 units, day specialty)" in thu_line


def test_format_daily_highlights_does_not_duplicate_specialty_in_top_n() -> None:
    heatmaps = [
        {"menu": "Choipan", "weeklyHeatmap": [{"day": "thu", "quantity": 42}]},
        {"menu": "Other", "weeklyHeatmap": [{"day": "thu", "quantity": 10}]},
    ]
    specialties = find_day_specialties(heatmaps)
    out = format_daily_highlights(
        heatmaps,
        {"Choipan": "low_end"},
        specialties=specialties,
    )
    thu_line = out.split("**thu:**")[1].split("\n")[0]
    assert thu_line.count("Choipan") == 1
    assert "day specialty" not in thu_line


def test_format_day_specialties_empty() -> None:
    assert format_day_specialties([]) == ""


def test_format_chart_markdown_section_menu_heatmap_daily_highlights() -> None:
    out = format_chart_markdown_section(
        chart_id="menu_item_heatmap",
        payload={
            "menuHeatmaps": [
                {
                    "menu": "Steak",
                    "menuCategory": "Mains",
                    "weeklyHeatmap": [{"day": "fri", "quantity": 10}],
                    "dailyHeatmap": [{"hour": 19, "quantity": 4}],
                }
            ],
            "allMenuHeatmaps": [
                {
                    "menu": "Steak",
                    "menuCategory": "Mains",
                    "weeklyHeatmap": [{"day": "fri", "quantity": 10}],
                    "dailyHeatmap": [{"hour": 19, "quantity": 4}],
                },
                {
                    "menu": "Choipan",
                    "menuCategory": "Specials",
                    "weeklyHeatmap": [{"day": "thu", "quantity": 42}],
                    "dailyHeatmap": [{"hour": 12, "quantity": 42}],
                },
            ],
            "matrixCategoryByMenu": {"Steak": "star", "Choipan": "low_end"},
            "matrixFilterApplied": True,
            "dailyStartHour": 8,
            "dailyEndHour": 22,
        },
    )
    assert "## Visualization data — Menu item heatmap" in out
    assert "### Daily highlights" in out
    assert "**thu:** Choipan (low_end, 42 units)" in out
    assert "### Day specialties" in out
    assert "**Choipan** (low_end): thu, 42 units (100% of weekly)" in out


def test_format_chart_markdown_section_fallback_note() -> None:
    out = format_chart_markdown_section(
        chart_id="venue_slot_strength_heatmap",
        payload={"slotDemandProfile": []},
        used_fallback_run=True,
    )
    assert "## Visualization data — Venue slot strength" in out
    assert "newer sales report" in out
    assert "(no slot demand data)" in out


def test_derive_daily_heatmap_hour_range_defaults() -> None:
    assert derive_daily_heatmap_hour_range([]) == (8, 22)


def test_derive_daily_heatmap_hour_range_from_hours() -> None:
    assert derive_daily_heatmap_hour_range([{"openTime": "10:00", "closeTime": "18:30"}]) == (
        10,
        18,
    )


@pytest.mark.asyncio
async def test_load_chart_data_prefers_pinned_run() -> None:
    client = MagicMock()

    async def fake_post(_client, query, variables, _user_id):
        if "OrderMetricsSlotDemand" in query:
            assert variables["analyticsRunId"] == "10"
            return {
                "orderMetrics": {
                    "slotDemandProfile": [
                        {
                            "day": "Tue",
                            "mealPeriodLabel": "Dinner",
                            "mealPeriodHoursLabel": "17-21",
                            "orderCount": 5,
                            "demandIndex": 0.8,
                            "relativeDemand": "low",
                        }
                    ]
                }
            }
        raise AssertionError(f"unexpected query: {query}")

    with patch(
        "agents_app.agents.core.chat.chart_data.graphql_post",
        new=AsyncMock(side_effect=fake_post),
    ):
        out = await load_chart_data_markdown(
            client,
            chart_id="venue_slot_strength_heatmap",
            location_id=7,
            user_id="u1",
            analytics_run_id=10,
        )

    assert "Venue slot strength" in out
    assert "Tue / Dinner" in out
    assert "newer sales report" not in out


@pytest.mark.asyncio
async def test_load_chart_data_falls_back_to_newer_run() -> None:
    client = MagicMock()
    calls: list[str] = []

    async def fake_post(_client, query, variables, _user_id):
        if "AnalyticsRunsForLocation" in query:
            return {"analyticsRuns": [{"id": "20"}, {"id": "10"}]}
        if "OrderMetricsSlotDemand" in query:
            run_id = str(variables["analyticsRunId"])
            calls.append(run_id)
            if run_id == "10":
                return {"orderMetrics": {"slotDemandProfile": []}}
            return {
                "orderMetrics": {
                    "slotDemandProfile": [
                        {
                            "day": "Wed",
                            "mealPeriodLabel": "Lunch",
                            "mealPeriodHoursLabel": "11-14",
                            "orderCount": 9,
                            "demandIndex": 1.1,
                            "relativeDemand": "medium",
                        }
                    ]
                }
            }
        raise AssertionError(query)

    with patch(
        "agents_app.agents.core.chat.chart_data.graphql_post",
        new=AsyncMock(side_effect=fake_post),
    ):
        out = await load_chart_data_markdown(
            client,
            chart_id="venue_slot_strength_heatmap",
            location_id=7,
            user_id="u1",
            analytics_run_id=10,
        )

    assert calls == ["10", "20"]
    assert "newer sales report" in out
    assert "Wed / Lunch" in out
