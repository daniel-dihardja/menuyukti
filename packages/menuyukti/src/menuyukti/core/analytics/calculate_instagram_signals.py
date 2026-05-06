"""Compose Instagram-facing signals from existing analytics outputs (no pandas)."""

from __future__ import annotations

from collections import defaultdict
from typing import TypedDict

from menuyukti.core.analytics.calculate_category_mix import CategoryMixResult
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    MenuEngineeringMatrixItem,
    MenuEngineeringMatrixResult,
)
from menuyukti.core.analytics.calculate_operating_profile import OperatingProfileResult
from menuyukti.core.analytics.calculate_revenue_trends import RevenueTrendRow, RevenueTrendsResult

# Cap list sizes returned to API / LLM consumers (full matrix still used upstream).
_MAX_INSTAGRAM_CONTENT_HEROES = 20
_MAX_INSTAGRAM_AVOID_ITEMS = 20
_MAX_INSTAGRAM_TRENDING_RISING = 24


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
    """Structured tiered signals for agent prompts."""

    capabilities: dict[str, object]
    fundamental_signals: dict[str, object]
    additional_signals: dict[str, object]


class CampaignPlanningSignals(TypedDict):
    """Operational planning helpers for campaign briefs."""

    recommended_posting_days: list[str]
    recommended_dayparts: list[str]
    objective_recommendation: str
    primary_cta_channel: str


class SignalConfidence(TypedDict):
    """Signal confidence and caveats for conservative planning."""

    tier: str
    coverage_notes: list[str]


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


def _trending_rising_sort_key(row: RevenueTrendRow) -> tuple[float, float, str]:
    raw_pct = row.get("pct_change")
    pct = float("-inf") if raw_pct is None else float(raw_pct)
    return (-pct, -float(row["current_revenue"]), str(row["menu"]))


def _infer_objective_recommendation(
    *,
    has_order_id: bool,
    has_datetime: bool,
    trending_items: list[RevenueTrendRow],
) -> str:
    if has_order_id and has_datetime and trending_items:
        return "conversion"
    if has_datetime and trending_items:
        return "consideration"
    return "awareness"


def _infer_primary_cta_channel(*, has_order_id: bool, objective: str) -> str:
    if objective == "conversion" and has_order_id:
        return "order_or_reservation"
    if objective == "consideration":
        return "dm"
    return "profile_visit"


def _signal_confidence(
    *,
    has_order_id: bool,
    has_datetime: bool,
    has_menu_engineering: bool,
) -> SignalConfidence:
    notes: list[str] = []
    score = 0
    if has_order_id:
        score += 1
    else:
        notes.append("Order-level linkage unavailable; avoid order-level conversion precision.")
    if has_datetime:
        score += 1
    else:
        notes.append("Datetime signals unavailable; avoid strict posting-time claims.")
    if has_menu_engineering:
        score += 1
    else:
        notes.append("Menu engineering matrix unavailable; hero/avoid menu confidence reduced.")
    tier = "high" if score == 3 else "medium" if score == 2 else "low"
    return SignalConfidence(tier=tier, coverage_notes=notes)


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

    Output list fields are capped (see module constants) so consumers never receive unbounded arrays.

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
        content_heroes = content_heroes[:_MAX_INSTAGRAM_CONTENT_HEROES]
        avoid_items = avoid_items[:_MAX_INSTAGRAM_AVOID_ITEMS]

    trending_items = [r for r in revenue_trends["rows"] if r["trend_label"] == "rising"]
    trending_items.sort(key=_trending_rising_sort_key)
    trending_items = trending_items[:_MAX_INSTAGRAM_TRENDING_RISING]

    rows = category_mix.get("rows") or []
    category_focus = rows[0] if rows else None

    capabilities = sales_analytics.get("capabilities")
    fundamental = sales_analytics.get("fundamental_signals")
    additional = sales_analytics.get("additional_signals")
    if not isinstance(capabilities, dict):
        msg = "sales_analytics must include capabilities"
        raise TypeError(msg)
    if not isinstance(fundamental, dict):
        msg = "sales_analytics must include fundamental_signals"
        raise TypeError(msg)
    if not isinstance(additional, dict):
        msg = "sales_analytics must include additional_signals"
        raise TypeError(msg)

    datetime_signals = additional.get("datetime_signals")
    menu_heatmaps = (
        datetime_signals.get("menu_heatmaps", [])
        if isinstance(datetime_signals, dict)
        else []
    )
    peak_hour = _aggregate_peak_hour_from_heatmaps(menu_heatmaps)

    has_datetime = bool(capabilities.get("has_datetime"))
    has_order_id = bool(capabilities.get("has_order_id"))

    if operating_profile is not None and has_datetime:
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

    total_rev = _coerce_float(
        fundamental["total_revenue"],
        "sales_analytics['fundamental_signals']['total_revenue']",
    )
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
        period_start=str(
            datetime_signals.get("period_start")
            if isinstance(datetime_signals, dict)
            else ""
        ),
        period_end=str(
            datetime_signals.get("period_end")
            if isinstance(datetime_signals, dict)
            else ""
        ),
        total_revenue=round(total_rev, 4),
        previous_period_total_revenue=round(prev_total, 4),
        revenue_vs_previous_pct=rev_vs_prev,
    )

    recommended_posting_days: list[str] = []
    recommended_dayparts: list[str] = []
    if operating_profile is not None and has_datetime:
        dow_rows = operating_profile.get("day_of_week_breakdown") or []
        if isinstance(dow_rows, list):
            ranked_days = sorted(
                [row for row in dow_rows if isinstance(row, dict)],
                key=lambda row: float(row.get("share") or 0.0),
                reverse=True,
            )
            recommended_posting_days = [
                str(row.get("day") or "") for row in ranked_days[:3] if str(row.get("day") or "")
            ]
        period_rows = operating_profile.get("meal_period_breakdown") or []
        if isinstance(period_rows, list):
            ranked_periods = sorted(
                [row for row in period_rows if isinstance(row, dict)],
                key=lambda row: float(row.get("share") or 0.0),
                reverse=True,
            )
            recommended_dayparts = [
                str(row.get("period") or "")
                for row in ranked_periods[:3]
                if str(row.get("period") or "")
            ]

    objective_recommendation = _infer_objective_recommendation(
        has_order_id=has_order_id,
        has_datetime=has_datetime,
        trending_items=trending_items,
    )
    primary_cta_channel = _infer_primary_cta_channel(
        has_order_id=has_order_id,
        objective=objective_recommendation,
    )
    planning_signals = CampaignPlanningSignals(
        recommended_posting_days=recommended_posting_days,
        recommended_dayparts=recommended_dayparts,
        objective_recommendation=objective_recommendation,
        primary_cta_channel=primary_cta_channel,
    )
    confidence = _signal_confidence(
        has_order_id=has_order_id,
        has_datetime=has_datetime,
        has_menu_engineering=menu_engineering is not None,
    )

    return InstagramSignalsResult(
        capabilities={
            "has_order_id": has_order_id,
            "has_datetime": has_datetime,
            "enabled_blocks": list(capabilities.get("enabled_blocks") or []),
        },
        fundamental_signals={
            "sales": {
                "total_items_sold": int(fundamental.get("total_items_sold") or 0),
                "total_revenue": round(total_rev, 4),
                "unique_menu_items": int(fundamental.get("unique_menu_items") or 0),
                "avg_item_price": float(fundamental.get("avg_item_price") or 0.0),
                "avg_popularity_threshold": float(
                    fundamental.get("avg_popularity_threshold") or 0.0
                ),
            },
            "category_focus": category_focus,
            "trending_items": trending_items,
        },
        additional_signals={
            "order_signals": additional.get("order_signals") if has_order_id else None,
            "datetime_signals": {
                "best_posting_window": best,
                "period_headline": period_headline,
                "menu_heatmaps": menu_heatmaps if has_datetime else [],
            }
            if has_datetime
            else None,
            "matrix_signals": {
                "content_heroes": content_heroes,
                "avoid_items": avoid_items,
            },
            "campaign_planning_signals": planning_signals,
            "signal_confidence": confidence,
        },
    )
