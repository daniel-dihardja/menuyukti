"""Unit tests for Instagram signal composition."""

from menuyukti.core.analytics.calculate_instagram_signals import calculate_instagram_signals
from menuyukti.core.analytics.calculate_menu_engineering_matrix import compute_menu_engineering_from_orders


def _sales_analytics_stub() -> dict[str, object]:
    return {
        "total_revenue": 200.0,
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
    assert sig["content_heroes"] == []
    assert sig["avoid_items"] == []
    assert sig["category_focus"]["category"] == "Mains"
    assert len(sig["trending_items"]) == 1
    assert sig["trending_items"][0]["menu"] == "Rising"
    assert sig["best_posting_window"]["peak_day"] == "fri"
    assert sig["best_posting_window"]["peak_hour"] == 18
    assert sig["period_headline"]["revenue_vs_previous_pct"] is not None


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

    hero_menus = {h["menu"] for h in sig["content_heroes"]}
    avoid_menus = {a["menu"] for a in sig["avoid_items"]}
    assert "StarItem" in hero_menus
    assert "LowEndItem" in avoid_menus
