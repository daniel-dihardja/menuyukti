"""Unit tests for Instagram signal composition."""

from unittest.mock import patch

from menuyukti.core.analytics.calculate_instagram_signals import calculate_instagram_signals
from menuyukti.core.analytics.calculate_menu_engineering_matrix import compute_menu_engineering_from_orders


def _sales_analytics_stub() -> dict[str, object]:
    return {
        "capabilities": {
            "has_order_id": True,
            "has_datetime": True,
            "enabled_blocks": ["fundamental_signals", "order_signals", "datetime_signals"],
        },
        "fundamental_signals": {
            "total_revenue": 200.0,
            "total_items_sold": 20,
            "unique_menu_items": 4,
            "avg_item_price": 10.0,
            "avg_popularity_threshold": 0.25,
            "popularity_index": [],
        },
        "additional_signals": {
            "order_signals": {"total_orders": 5},
            "datetime_signals": {
                "period_start": "2026-01-01",
                "period_end": "2026-01-31",
                "menu_heatmaps": [
                    {
                        "menu": "A",
                        "menu_category": None,
                        "menu_category_detail": None,
                        "daily_heatmap": [{"hour": 12, "quantity": 5}, {"hour": 18, "quantity": 10}],
                        "weekly_heatmap": [],
                        "reporting_period": "2026-01",
                    },
                    {
                        "menu": "B",
                        "menu_category": None,
                        "menu_category_detail": None,
                        "daily_heatmap": [{"hour": 18, "quantity": 3}],
                        "weekly_heatmap": [],
                        "reporting_period": "2026-01",
                    },
                ],
            },
        },
    }


def _category_mix_stub():
    return {
        "rows": [
            {
                "category": "Mains",
                "total_revenue": 150.0,
                "revenue_share": 0.75,
                "total_qty": 10,
                "qty_share": 0.8,
                "top_item": "Hero",
            }
        ],
        "top_revenue_category": "Mains",
    }


def _revenue_trends_stub():
    return {
        "rows": [
            {
                "menu": "Rising",
                "current_revenue": 100.0,
                "previous_revenue": 50.0,
                "revenue_delta": 50.0,
                "pct_change": 1.0,
                "current_rank": 1,
                "previous_rank": 2,
                "rank_change": 1,
                "trend_label": "rising",
            },
            {
                "menu": "Flat",
                "current_revenue": 50.0,
                "previous_revenue": 48.0,
                "revenue_delta": 2.0,
                "pct_change": 0.04,
                "current_rank": 2,
                "previous_rank": 1,
                "rank_change": -1,
                "trend_label": "stable",
            },
        ],
        "current_period_total_revenue": 200.0,
        "previous_period_total_revenue": 100.0,
    }


def _operating_profile_stub():
    return {
        "total_orders": 10,
        "total_revenue": 200.0,
        "active_days_count": 5,
        "avg_daily_orders": 2.0,
        "avg_order_size": 3.0,
        "avg_revenue_per_order": 20.0,
        "avg_active_days_per_week": 5.0,
        "weekday_share": 0.5,
        "weekend_share": 0.5,
        "holiday_share": 0.0,
        "peak_day": "fri",
        "peak_revenue_day": "sat",
        "primary_meal_period": "dinner",
        "peak_revenue_meal_period": "dinner",
        "active_meal_periods": ["dinner"],
        "day_of_week_breakdown": [],
        "day_type_breakdown": [],
        "meal_period_breakdown": [],
        "operating_pattern": "all_week",
        "dining_focus": "dinner_restaurant",
    }


def test_instagram_signals_without_menu_engineering():
    sig = calculate_instagram_signals(
        category_mix=_category_mix_stub(),
        revenue_trends=_revenue_trends_stub(),
        sales_analytics=_sales_analytics_stub(),
        operating_profile=_operating_profile_stub(),
        menu_engineering=None,
    )
    assert sig["additional_signals"]["matrix_signals"]["content_heroes"] == []
    assert sig["additional_signals"]["matrix_signals"]["avoid_items"] == []
    assert sig["fundamental_signals"]["category_focus"]["category"] == "Mains"
    assert len(sig["fundamental_signals"]["trending_items"]) == 1
    assert sig["fundamental_signals"]["trending_items"][0]["menu"] == "Rising"
    posting = sig["additional_signals"]["datetime_signals"]["best_posting_window"]
    assert posting["peak_day"] == "fri"
    assert posting["peak_hour"] == 18
    headline = sig["additional_signals"]["datetime_signals"]["period_headline"]
    assert headline["revenue_vs_previous_pct"] is not None


def test_instagram_signals_with_matrix_filters_heroes_and_avoid():
    order_rows = [
        {"menu": "StarItem", "qty": 5, "total_after_bill_discount": 100.0},
        {"menu": "PlowHorseItem", "qty": 5, "total_after_bill_discount": 30.0},
        {"menu": "PuzzleItem", "qty": 1, "total_after_bill_discount": 50.0},
        {"menu": "LowEndItem", "qty": 1, "total_after_bill_discount": 5.5},
    ]
    cogs_by_menu = {
        "StarItem": 5.0,
        "PlowHorseItem": 5.0,
        "PuzzleItem": 5.0,
        "LowEndItem": 5.0,
    }
    matrix = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)

    sig = calculate_instagram_signals(
        category_mix=_category_mix_stub(),
        revenue_trends=_revenue_trends_stub(),
        sales_analytics=_sales_analytics_stub(),
        operating_profile=None,
        menu_engineering=matrix,
    )

    matrix = sig["additional_signals"]["matrix_signals"]
    hero_menus = {h["menu"] for h in matrix["content_heroes"]}
    avoid_menus = {a["menu"] for a in matrix["avoid_items"]}
    assert "StarItem" in hero_menus
    assert "LowEndItem" in avoid_menus


def _matrix_stub_item(menu: str, category: str, total_revenue: float) -> dict:
    return {
        "menu": menu,
        "category": category,
        "total_revenue": total_revenue,
        "menu_category": None,
        "menu_category_detail": None,
    }


def test_instagram_signals_caps_heroes_avoid_and_trending():
    many_stars = [_matrix_stub_item(f"star_{i}", "star", 200.0 - i) for i in range(30)]
    many_low = [_matrix_stub_item(f"low_{i}", "low_end", 50.0 - i) for i in range(35)]
    matrix = {"items": many_stars + many_low, "thresholds": {}, "distribution": []}

    rising_rows = [
        {
            "menu": f"rise_{i}",
            "current_revenue": 100.0 - i,
            "previous_revenue": 10.0,
            "revenue_delta": 90.0,
            "pct_change": 2.0 + i * 0.01,
            "current_rank": i + 1,
            "previous_rank": 10,
            "rank_change": -1,
            "trend_label": "rising",
        }
        for i in range(40)
    ]
    trends = {
        "rows": rising_rows
        + [
            {
                "menu": "flat",
                "current_revenue": 5.0,
                "previous_revenue": 5.0,
                "revenue_delta": 0.0,
                "pct_change": 0.0,
                "current_rank": 99,
                "previous_rank": 99,
                "rank_change": 0,
                "trend_label": "stable",
            }
        ],
        "current_period_total_revenue": 500.0,
        "previous_period_total_revenue": 100.0,
    }

    sig = calculate_instagram_signals(
        category_mix=_category_mix_stub(),
        revenue_trends=trends,
        sales_analytics=_sales_analytics_stub(),
        operating_profile=_operating_profile_stub(),
        menu_engineering=matrix,
    )
    assert len(sig["additional_signals"]["matrix_signals"]["content_heroes"]) == 20
    assert len(sig["additional_signals"]["matrix_signals"]["avoid_items"]) == 20
    assert len(sig["fundamental_signals"]["trending_items"]) == 24
    trending = sig["fundamental_signals"]["trending_items"]
    assert trending[0]["pct_change"] >= trending[-1]["pct_change"]


def test_instagram_signals_trending_cap_respects_lower_constant():
    matrix = {"items": [_matrix_stub_item("S", "star", 100.0)], "thresholds": {}, "distribution": []}
    rising = [
        {
            "menu": f"r{i}",
            "current_revenue": 10.0,
            "previous_revenue": 5.0,
            "revenue_delta": 5.0,
            "pct_change": 0.5,
            "current_rank": 1,
            "previous_rank": 2,
            "rank_change": 1,
            "trend_label": "rising",
        }
        for i in range(10)
    ]
    trends = {
        "rows": rising,
        "current_period_total_revenue": 100.0,
        "previous_period_total_revenue": 50.0,
    }
    with patch(
        "menuyukti.core.analytics.calculate_instagram_signals._MAX_INSTAGRAM_TRENDING_RISING",
        3,
    ):
        sig = calculate_instagram_signals(
            category_mix=_category_mix_stub(),
            revenue_trends=trends,
            sales_analytics=_sales_analytics_stub(),
            operating_profile=None,
            menu_engineering=matrix,
        )
    assert len(sig["fundamental_signals"]["trending_items"]) == 3
