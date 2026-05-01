"""Tests for promotion candidate matrix grouping by menu_category."""

from __future__ import annotations

import pytest

from menuyukti.core.analytics.calculate_menu_engineering_promotion_candidates import (
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
    assert len(out["topPuzzles"]) <= 5


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
