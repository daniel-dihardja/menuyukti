"""Compose Instagram-facing signals from existing analytics outputs (no pandas)."""

from __future__ import annotations

from collections import defaultdict
from typing import TypedDict

from menuyukti.core.analytics.calculate_category_mix import (
    CategoryMixRow,
    CategoryMixResult,
)
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    MenuEngineeringMatrixItem,
    MenuEngineeringMatrixResult,
)
from menuyukti.core.analytics.calculate_operating_profile import OperatingProfileResult
from menuyukti.core.analytics.calculate_revenue_trends import (
    RevenueTrendRow,
    RevenueTrendsResult,
)


class MatrixBackedItem(TypedDict):
    """Subset of menu engineering fields useful for caption guardrails."""

    menu: str
    matrix_category: str
    total_revenue: float
    menu_category: str | None
    menu_category_detail: str | None


class BestPostingWindow(TypedDict):
    """When customers order most — venue-level plus global peak hour from heatmaps."""

    peak_day: str | None
    peak_revenue_day: str | None
    primary_meal_period: str | None
    peak_revenue_meal_period: str | None
    peak_hour: int | None


class PeriodHeadline(TypedDict):
    """Period range and revenue comparison for intro copy."""

    period_start: str
    period_end: str
    total_revenue: float
    previous_period_total_revenue: float
    revenue_vs_previous_pct: float | None


class InstagramSignalsResult(TypedDict):
    """Structured signals for Instagram agent prompts."""

    content_heroes: list[MatrixBackedItem]
    trending_items: list[RevenueTrendRow]
    avoid_items: list[MatrixBackedItem]
    category_focus: CategoryMixRow | None
    best_posting_window: BestPostingWindow
    period_headline: PeriodHeadline


def _aggregate_peak_hour_from_heatmaps(menu_heatmaps: object) -> int | None:
    """Sum quantities across all menus by clock hour; return hour with max demand (tie: lowest hour)."""
    if not isinstance(menu_heatmaps, list) or not menu_heatmaps:
        return None
    hour_qty: dict[int, int] = defaultdict(int)
    for payload in menu_heatmaps:
        if not isinstance(payload, dict):
            continue
        daily = payload.get("daily_heatmap")
        if not isinstance(daily, list):
            continue
        for row in daily:
            if not isinstance(row, dict):
                continue
            try:
                h = int(row["hour"])
                hour_qty[h] += int(row["quantity"])
            except (KeyError, TypeError, ValueError):
                continue
    if not hour_qty:
        return None
    max_q = max(hour_qty.values())
    candidates = [h for h, q in hour_qty.items() if q == max_q]
    return min(candidates)


def _matrix_item_to_signal(item: MenuEngineeringMatrixItem) -> MatrixBackedItem:
    mc = item.get("menu_category")
    mcd = item.get("menu_category_detail")
    return MatrixBackedItem(
        menu=item["menu"],
        matrix_category=item["category"],
        total_revenue=float(item["total_revenue"]),
        menu_category=mc if isinstance(mc, str) else None,
        menu_category_detail=mcd if isinstance(mcd, str) else None,
    )


def _coerce_float(value: object, field: str) -> float:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    msg = f"{field} must be int or float"
    raise TypeError(msg)


def calculate_instagram_signals(
    *,
    category_mix: CategoryMixResult,
    revenue_trends: RevenueTrendsResult,
    sales_analytics: dict[str, object],
    operating_profile: OperatingProfileResult | None,
    menu_engineering: MenuEngineeringMatrixResult | None,
) -> InstagramSignalsResult:
    """
    Combine category mix, revenue trends, sales summary, operating profile, and optional
    menu engineering into a single JSON-friendly structure for LLM prompts.

    ``menu_engineering`` may be ``None`` when COGS is unavailable; hero/avoid lists are then empty.

    **Matrix categories** follow :func:`calculate_menu_engineering_matrix` (``star``,
    ``plow_horse``, ``puzzle``, ``low_end``). ``avoid_items`` uses ``low_end`` (classic
    "dog" quadrant).
    """
    content_heroes: list[MatrixBackedItem] = []
    avoid_items: list[MatrixBackedItem] = []

    if menu_engineering is not None:
        for raw in menu_engineering.get("items", []):
            cat = raw["category"]
            if cat == "star":
                content_heroes.append(_matrix_item_to_signal(raw))
            elif cat == "low_end":
                avoid_items.append(_matrix_item_to_signal(raw))

        content_heroes.sort(key=lambda x: (-x["total_revenue"], x["menu"]))
        avoid_items.sort(key=lambda x: (-x["total_revenue"], x["menu"]))

    trending_items = [r for r in revenue_trends["rows"] if r["trend_label"] == "rising"]

    rows = category_mix.get("rows") or []
    category_focus: CategoryMixRow | None = rows[0] if rows else None

    menu_heatmaps = sales_analytics.get("menu_heatmaps", [])
    peak_hour = _aggregate_peak_hour_from_heatmaps(menu_heatmaps)

    if operating_profile is not None:
        best = BestPostingWindow(
            peak_day=operating_profile.get("peak_day"),
            peak_revenue_day=operating_profile.get("peak_revenue_day"),
            primary_meal_period=operating_profile.get("primary_meal_period"),
            peak_revenue_meal_period=operating_profile.get("peak_revenue_meal_period"),
            peak_hour=peak_hour,
        )
    else:
        best = BestPostingWindow(
            peak_day=None,
            peak_revenue_day=None,
            primary_meal_period=None,
            peak_revenue_meal_period=None,
            peak_hour=peak_hour,
        )

    total_rev = _coerce_float(sales_analytics["total_revenue"], "sales_analytics['total_revenue']")
    prev_total = _coerce_float(
        revenue_trends["previous_period_total_revenue"],
        "revenue_trends['previous_period_total_revenue']",
    )
    rev_vs_prev: float | None
    if prev_total > 0:
        rev_vs_prev = round((total_rev - prev_total) / prev_total, 6)
    else:
        rev_vs_prev = None

    period_headline = PeriodHeadline(
        period_start=str(sales_analytics["period_start"]),
        period_end=str(sales_analytics["period_end"]),
        total_revenue=round(total_rev, 4),
        previous_period_total_revenue=round(prev_total, 4),
        revenue_vs_previous_pct=rev_vs_prev,
    )

    return InstagramSignalsResult(
        content_heroes=content_heroes,
        trending_items=trending_items,
        avoid_items=avoid_items,
        category_focus=category_focus,
        best_posting_window=best,
        period_headline=period_headline,
    )
