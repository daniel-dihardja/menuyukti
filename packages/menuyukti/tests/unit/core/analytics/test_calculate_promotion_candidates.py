"""Unit tests for promotion candidate composition."""

from menuyukti.core.analytics.calculate_promotion_candidates import (
    calculate_promotion_candidates,
)


def _items() -> list[dict]:
    return [
        {
            "menu": "Nasi Goreng",
            "quantity": 100,
            "total_revenue": 5000.0,
            "menu_category": "Main",
            "menu_category_detail": "Rice",
            "category": "star",
            "action": "promote",
            "peak_day": "fri",
            "peak_hour": 19,
            "contribution_margin_percentage": 0.35,
        },
        {
            "menu": "Iced Tea",
            "quantity": 50,
            "total_revenue": 1000.0,
            "menu_category": "Drink",
            "menu_category_detail": "Tea",
            "category": "low_end",
            "action": "remove",
            "peak_day": "sat",
            "peak_hour": 14,
            "contribution_margin_percentage": 0.1,
        },
        {
            "menu": "Truffle Pasta",
            "quantity": 40,
            "total_revenue": 3200.0,
            "menu_category": "Main",
            "menu_category_detail": "Pasta",
            "category": "puzzle",
            "action": "promote",
            "peak_day": "sat",
            "peak_hour": 20,
            "contribution_margin_percentage": 0.42,
        },
        {
            "menu": "Lava Cake",
            "quantity": 30,
            "total_revenue": 1800.0,
            "menu_category": "Dessert",
            "menu_category_detail": "Cake",
            "category": "puzzle",
            "action": "promote",
            "peak_day": "sun",
            "peak_hour": 19,
            "contribution_margin_percentage": 0.38,
        },
    ]


def test_calculate_promotion_candidates_builds_ranked_slices_and_puzzle_pool() -> None:
    result = calculate_promotion_candidates(
        promotion_menu_items=_items(),
        content_heroes=[{"menu": "Nasi Goreng"}],
        trending_items=[{"menu": "Nasi Goreng"}, {"menu": "Truffle Pasta"}],
        avoid_items=[{"menu": "Iced Tea"}],
        best_posting_window={
            "peak_day": "fri",
            "peak_hour": 19,
            "primary_meal_period": None,
        },
    )

    assert result["ranked_candidates_total_count"] == 4
    assert len(result["ranked_candidates"]) == 4
    assert any(r["menu"] == "Nasi Goreng" for r in result["top_promote"])
    assert any(r["menu"] == "Iced Tea" for r in result["top_avoid"])
    pool = result["puzzle_opportunity_pool"]
    assert pool["puzzle_items_found"] == 2
    assert pool["selected_count"] >= 1
    assert any(r["menu"] == "Truffle Pasta" for r in pool["selected"])


def test_calculate_promotion_candidates_handles_empty_input() -> None:
    result = calculate_promotion_candidates(
        promotion_menu_items=[],
        content_heroes=[],
        trending_items=[],
        avoid_items=[],
        best_posting_window=None,
    )
    assert result["ranked_candidates"] == []
    assert result["ranked_candidates_total_count"] == 0
    assert result["best_posting_window_summary"] == "not available"


def test_calculate_promotion_candidates_posting_window_summary() -> None:
    result = calculate_promotion_candidates(
        promotion_menu_items=_items()[:1],
        content_heroes=[],
        trending_items=[],
        avoid_items=[],
        best_posting_window={
            "peak_day": "sat",
            "peak_hour": 18,
            "primary_meal_period": "dinner",
        },
    )
    assert "peak day: sat" in result["best_posting_window_summary"]
    assert "peak hour: 18:00" in result["best_posting_window_summary"]
    assert "primary meal period: dinner" in result["best_posting_window_summary"]
