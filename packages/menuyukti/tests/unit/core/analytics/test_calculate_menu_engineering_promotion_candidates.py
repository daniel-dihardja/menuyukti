"""Tests for promotion candidate matrix grouping by menu_category."""

from __future__ import annotations

import pytest

from menuyukti.core.analytics.calculate_menu_engineering_promotion_candidates import (
    _price_level_by_menu,
    _price_level_for_unit_price,
    compute_menu_engineering_promotion_candidates,
)


def _row(
    menu: str,
    qty: int,
    revenue: float,
    *,
    menu_category: str | None = "Mains",
    menu_category_detail: str | None = None,
) -> dict[str, object]:
    return {
        "menu": menu,
        "qty": qty,
        "total_after_bill_discount": revenue,
        "menu_category": menu_category,
        "menu_category_detail": menu_category_detail,
    }


def test_flat_when_all_menu_category_blank() -> None:
    cogs = {"A": 2.0, "B": 3.0}
    rows = [
        _row("A", 10, 100.0, menu_category="   "),
        _row("B", 5, 80.0, menu_category=None),
    ]
    out = compute_menu_engineering_promotion_candidates(rows, cogs)
    assert out["grouping"] == "flat"
    assert out["rowsSkippedMissingCategory"] == 2
    assert out["matrix"] is not None
    assert len(out["topStars"]) <= 5
    assert len(out["topPuzzles"]) <= 10
    for item in out["topStars"] + out["topPuzzles"]:
        assert set(item.keys()) == {"menu", "quantity", "popularity", "price_level"}
        assert item["price_level"] in {1, 2, 3}
        assert 0.0 <= item["popularity"] <= 1.0
    total_qty = 15
    for item in out["topStars"] + out["topPuzzles"]:
        expected = round(item["quantity"] / total_qty, 6)
        assert item["popularity"] == expected


def test_grouped_by_distinct_menu_category() -> None:
    cogs = {"P1": 1.0, "P2": 1.0, "D1": 0.5}
    rows = [
        _row("P1", 20, 200.0, menu_category="Plates"),
        _row("P2", 15, 150.0, menu_category="Plates"),
        _row("D1", 30, 90.0, menu_category="Drinks"),
    ]
    out = compute_menu_engineering_promotion_candidates(rows, cogs)
    assert out["grouping"] == "by_menu_category"
    assert out["rowsSkippedMissingCategory"] == 0
    cats = out["categories"]
    assert set(cats.keys()) == {"Drinks", "Plates"}
    for payload in cats.values():
        assert "matrix" in payload
        assert "topStars" in payload
        assert "topPuzzles" in payload
        assert payload["matrix"] is not None
        for item in payload["topStars"] + payload["topPuzzles"]:
            assert set(item.keys()) == {"menu", "quantity", "popularity", "price_level"}
            assert item["price_level"] in {1, 2, 3}
    plates_total = 35
    drinks_total = 30
    plates_items = {i["menu"]: i for i in cats["Plates"]["topStars"] + cats["Plates"]["topPuzzles"]}
    drinks_items = {i["menu"]: i for i in cats["Drinks"]["topStars"] + cats["Drinks"]["topPuzzles"]}
    if "P1" in plates_items:
        assert plates_items["P1"]["popularity"] == round(20 / plates_total, 6)
    if "D1" in drinks_items:
        assert drinks_items["D1"]["popularity"] == round(30 / drinks_total, 6)


def test_grouped_excludes_blank_category_rows() -> None:
    cogs = {"X": 1.0, "Y": 2.0}
    rows = [
        _row("X", 10, 100.0, menu_category="OnlyCat"),
        _row("Y", 5, 50.0, menu_category=""),
    ]
    out = compute_menu_engineering_promotion_candidates(rows, cogs)
    assert out["grouping"] == "by_menu_category"
    assert out["rowsSkippedMissingCategory"] == 1
    assert set(out["categories"].keys()) == {"OnlyCat"}


def test_empty_bucket_reason() -> None:
    cogs: dict[str, float] = {}
    rows = [_row("Z", 1, 10.0, menu_category="Solo")]
    out = compute_menu_engineering_promotion_candidates(rows, cogs)
    assert out["grouping"] == "by_menu_category"
    solo = out["categories"]["Solo"]
    assert solo["matrix"] is None
    assert solo["reason"]


def test_order_rows_empty_raises() -> None:
    with pytest.raises(ValueError, match="order_rows"):
        compute_menu_engineering_promotion_candidates([], {})


def test_unlimited_star_items_when_max_is_none() -> None:
    cogs = {f"I{i}": 1.0 for i in range(12)}
    rows = [_row(f"I{i}", 10 + i, 100.0 + i, menu_category="Mains") for i in range(12)]
    capped = compute_menu_engineering_promotion_candidates(rows, cogs, max_star_items=5)
    unlimited = compute_menu_engineering_promotion_candidates(rows, cogs, max_star_items=None)
    assert len(capped["categories"]["Mains"]["topStars"]) <= 5
    assert len(unlimited["categories"]["Mains"]["topStars"]) >= len(
        capped["categories"]["Mains"]["topStars"]
    )


def test_price_level_tertiles_within_category() -> None:
    matrix = {
        "thresholds": {
            "avg_popularity": 1.0,
            "avg_contribution_margin": 1.0,
            "total_cogs": 0.0,
            "total_profit": 0.0,
            "total_margin": 0.0,
        },
        "distribution": [],
        "items": [
            {"menu": "Low", "quantity": 10, "total_revenue": 100.0, "category": "star"},
            {"menu": "Mid", "quantity": 10, "total_revenue": 200.0, "category": "star"},
            {"menu": "High", "quantity": 10, "total_revenue": 300.0, "category": "star"},
        ],
    }
    levels = _price_level_by_menu(matrix)  # type: ignore[arg-type]
    assert levels == {"Low": 1, "Mid": 2, "High": 3}


def test_price_level_flat_grouping() -> None:
    cogs = {"Low": 1.0, "Mid": 1.0, "High": 1.0}
    rows = [
        _row("Low", 10, 100.0, menu_category=""),
        _row("Mid", 10, 200.0, menu_category=None),
        _row("High", 10, 300.0, menu_category="  "),
    ]
    out = compute_menu_engineering_promotion_candidates(
        rows,
        cogs,
        max_star_items=None,
        max_puzzle_items=None,
    )
    assert out["grouping"] == "flat"
    matrix = out["matrix"]
    assert matrix is not None
    levels = _price_level_by_menu(matrix)
    assert levels == {"Low": 1, "Mid": 2, "High": 3}
    for item in out["topStars"] + out["topPuzzles"]:
        assert item["price_level"] == levels[item["menu"]]


def test_price_level_equal_unit_prices_default_to_mid() -> None:
    assert _price_level_for_unit_price(12.0, min_price=12.0, max_price=12.0) == 2
    cogs = {"A": 1.0, "B": 1.0}
    rows = [
        _row("A", 10, 100.0, menu_category="Mains"),
        _row("B", 5, 50.0, menu_category="Mains"),
    ]
    out = compute_menu_engineering_promotion_candidates(rows, cogs)
    for item in out["categories"]["Mains"]["topStars"] + out["categories"]["Mains"]["topPuzzles"]:
        assert item["price_level"] == 2
