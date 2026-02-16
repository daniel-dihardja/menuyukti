from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel

from marketing_engine.core.inputs import CoreInputs
from marketing_engine.features import register_provider


class AudienceFeatures(BaseModel):
    """
    Agent-specific features for audience definition.
    """

    top_items: list[str]
    peak_hours: list[int]
    weekday_bias: str
    daypart_profile: dict[str, float]
    weekday_profile: dict[str, float]
    party_size_signal: str
    social_dining_score: float
    avg_order_items: float
    avg_order_revenue: float
    top_item_revenue_share_ratio: float
    popularity_index_coverage: int
    primary_category: str
    analysis_window_days: int | None = None
    intent_hints: list[str]


_AUDIENCE_AGENT_CONFIG = {
    "top_items_limit": 3,
    "peak_hours_limit": 3,
    "daypart_hour_cutoffs": {
        "morning_end_hour": 11,
        "lunch_end_hour": 14,
        "afternoon_end_hour": 17,
    },
    "party_size_thresholds": {
        "solo_max_avg_items": 1.8,
        "pair_max_avg_items": 2.8,
    },
    "social_dining_scores": {
        "solo": 0.3,
        "pair": 0.6,
        "group": 0.85,
    },
}


def _safe_ratio(part: float, total: float) -> float:
    if total <= 0:
        return 0.0
    return part / total


def _parse_iso_date(value: Any) -> date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def derive_audience_features_from_core_input(
    core_input: dict[str, Any],
) -> dict[str, Any]:
    """
    Derive audience features directly from agent `core_input` payload.
    """
    matrix_items = core_input.get("matrix_items", [])
    heatmaps = core_input.get("heatmaps", [])
    sales_summary = core_input.get("sales_summary", {})

    sorted_items = sorted(
        matrix_items,
        key=lambda item: float(item.get("quantity", 0)),
        reverse=True,
    )
    top_items = [
        str(item.get("menu", "")).strip()
        for item in sorted_items[: _AUDIENCE_AGENT_CONFIG["top_items_limit"]]
    ]
    top_items = [item for item in top_items if item]
    if not top_items:
        top_items = ["No top items available"]

    hourly_counts: dict[int, float] = {}
    for heatmap in heatmaps:
        for row in heatmap.get("daily_heatmap", []):
            hour = int(row.get("hour", 0))
            qty = float(row.get("quantity", 0))
            hourly_counts[hour] = hourly_counts.get(hour, 0.0) + qty

    peak_hours = [
        f"{hour:02d}:00"
        for hour, _ in sorted(
            hourly_counts.items(), key=lambda kv: kv[1], reverse=True
        )[: _AUDIENCE_AGENT_CONFIG["peak_hours_limit"]]
    ]
    if not peak_hours:
        peak_hours = ["No peak-hour data"]

    daypart_totals = {"morning": 0.0, "lunch": 0.0, "afternoon": 0.0, "evening": 0.0}
    for hour, qty in hourly_counts.items():
        if hour < _AUDIENCE_AGENT_CONFIG["daypart_hour_cutoffs"]["morning_end_hour"]:
            daypart_totals["morning"] += qty
        elif hour < _AUDIENCE_AGENT_CONFIG["daypart_hour_cutoffs"]["lunch_end_hour"]:
            daypart_totals["lunch"] += qty
        elif hour < _AUDIENCE_AGENT_CONFIG["daypart_hour_cutoffs"]["afternoon_end_hour"]:
            daypart_totals["afternoon"] += qty
        else:
            daypart_totals["evening"] += qty
    daypart_total_qty = sum(daypart_totals.values())
    daypart_profile = {
        key: (value / daypart_total_qty if daypart_total_qty > 0 else 0.0)
        for key, value in daypart_totals.items()
    }

    weekday_order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    weekday_counts: dict[str, float] = {day: 0.0 for day in weekday_order}
    for heatmap in heatmaps:
        for row in heatmap.get("weekly_heatmap", []):
            day = str(row.get("day", "")).lower()
            if day in weekday_counts:
                weekday_counts[day] += float(row.get("quantity", 0))

    weekday_total = sum(
        weekday_counts[day] for day in ["mon", "tue", "wed", "thu", "fri"]
    )
    weekend_total = sum(weekday_counts[day] for day in ["sat", "sun"])
    if weekday_total > weekend_total:
        weekday_bias = "weekday"
    elif weekend_total > weekday_total:
        weekday_bias = "weekend"
    else:
        weekday_bias = "balanced"

    weekday_all_qty = sum(weekday_counts.values())
    weekday_profile = {
        day: (qty / weekday_all_qty if weekday_all_qty > 0 else 0.0)
        for day, qty in weekday_counts.items()
    }

    avg_order_items = float(sales_summary.get("avg_order_items", 0) or 0)
    if avg_order_items < _AUDIENCE_AGENT_CONFIG["party_size_thresholds"]["solo_max_avg_items"]:
        party_size_signal = "mostly solo orders"
        social_dining_score = _AUDIENCE_AGENT_CONFIG["social_dining_scores"]["solo"]
    elif (
        avg_order_items
        < _AUDIENCE_AGENT_CONFIG["party_size_thresholds"]["pair_max_avg_items"]
    ):
        party_size_signal = "mostly pair orders"
        social_dining_score = _AUDIENCE_AGENT_CONFIG["social_dining_scores"]["pair"]
    else:
        party_size_signal = "group-heavy orders"
        social_dining_score = _AUDIENCE_AGENT_CONFIG["social_dining_scores"]["group"]

    popularity_index = sales_summary.get("popularity_index", []) or []
    popularity_index_coverage = (
        len(popularity_index) if isinstance(popularity_index, list) else 0
    )

    total_revenue = sum(
        float(item.get("total_revenue", 0) or 0) for item in matrix_items
    )
    top_revenue = sum(
        float(item.get("total_revenue", 0) or 0)
        for item in sorted_items[: _AUDIENCE_AGENT_CONFIG["top_items_limit"]]
    )
    top_item_revenue_share_ratio = (
        (top_revenue / total_revenue) if total_revenue > 0 else 0.0
    )

    category_qty: dict[str, float] = {}
    for item in matrix_items:
        category = str(item.get("menu_category") or "Uncategorized")
        category_qty[category] = category_qty.get(category, 0.0) + float(
            item.get("quantity", 0) or 0
        )
    sorted_category_mix = sorted(
        category_qty.items(), key=lambda kv: kv[1], reverse=True
    )
    primary_category = (
        sorted_category_mix[0][0] if sorted_category_mix else "Uncategorized"
    )

    start_date = _parse_iso_date(sales_summary.get("period_start"))
    end_date = _parse_iso_date(sales_summary.get("period_end"))
    analysis_window_days = None
    if start_date and end_date:
        analysis_window_days = max((end_date - start_date).days + 1, 1)

    intent_hints = [
        "quick daily purchase",
        "after-work treat",
        "social sharing occasions",
    ]
    if primary_category.lower() == "beverages":
        intent_hints.append("beverage-led occasions")

    avg_order_revenue = float(sales_summary.get("avg_order_revenue", 0) or 0)

    features: dict[str, Any] = {
        "top_items": top_items,
        "peak_hours": peak_hours,
        "weekday_bias": weekday_bias,
        "daypart_profile": daypart_profile,
        "weekday_profile": weekday_profile,
        "party_size_signal": party_size_signal,
        "social_dining_score": social_dining_score,
        "avg_order_items": avg_order_items,
        "avg_order_revenue": avg_order_revenue,
        "top_item_revenue_share_ratio": top_item_revenue_share_ratio,
        "popularity_index_coverage": popularity_index_coverage,
        "primary_category": primary_category,
        "intent_hints": intent_hints,
    }
    if analysis_window_days is not None:
        features["analysis_window_days"] = analysis_window_days
    return features


def build_audience_features(
    core: CoreInputs,
    shared: object | None = None,
) -> AudienceFeatures:
    """
    Build audience-oriented features from core inputs.
    """
    del shared

    # Top items by quantity
    sorted_items = sorted(core.matrix_items, key=lambda i: i.quantity, reverse=True)
    top_items = [item.menu for item in sorted_items[:5]]

    # Aggregate peak hours from heatmaps
    hour_counts: dict[int, int] = {}
    for hm in core.heatmaps:
        for h in hm.daily_heatmap:
            hour_counts[h.hour] = hour_counts.get(h.hour, 0) + h.quantity

    peak_hours = [hour for hour, _ in sorted(hour_counts.items(), key=lambda kv: kv[1], reverse=True)[:3]]

    # Weekday bias + weekday profile
    weekday_total = 0
    weekend_total = 0
    weekday_counts: dict[str, int] = {
        "mon": 0,
        "tue": 0,
        "wed": 0,
        "thu": 0,
        "fri": 0,
        "sat": 0,
        "sun": 0,
    }
    for hm in core.heatmaps:
        for w in hm.weekly_heatmap:
            day = w.day.lower()
            if day in weekday_counts:
                weekday_counts[day] += w.quantity
            if day in {"sat", "sun"}:
                weekend_total += w.quantity
            else:
                weekday_total += w.quantity

    if weekday_total > weekend_total:
        weekday_bias = "weekday"
    elif weekend_total > weekday_total:
        weekday_bias = "weekend"
    else:
        weekday_bias = "balanced"

    weekday_total_qty = sum(weekday_counts.values())
    weekday_profile = {
        day: _safe_ratio(qty, weekday_total_qty) for day, qty in weekday_counts.items()
    }

    # Daypart profile
    daypart_totals: dict[str, int] = {
        "morning": 0,
        "lunch": 0,
        "afternoon": 0,
        "evening": 0,
    }
    for hm in core.heatmaps:
        for h in hm.daily_heatmap:
            if h.hour < 11:
                daypart_totals["morning"] += h.quantity
            elif h.hour < 14:
                daypart_totals["lunch"] += h.quantity
            elif h.hour < 17:
                daypart_totals["afternoon"] += h.quantity
            else:
                daypart_totals["evening"] += h.quantity
    daypart_total_qty = sum(daypart_totals.values())
    daypart_profile = {
        part: _safe_ratio(qty, daypart_total_qty) for part, qty in daypart_totals.items()
    }

    # Sales-summary-based audience signals (optional)
    avg_order_items = float(core.sales_summary.avg_order_items) if core.sales_summary else 0.0
    avg_order_revenue = (
        float(core.sales_summary.avg_order_revenue) if core.sales_summary else 0.0
    )

    if avg_order_items < 1.8:
        party_size_signal = "mostly_solo"
        social_dining_score = 0.3
    elif avg_order_items < 2.8:
        party_size_signal = "mostly_pair"
        social_dining_score = 0.6
    else:
        party_size_signal = "group_heavy"
        social_dining_score = 0.85

    popularity_index_coverage = (
        len(core.sales_summary.popularity_index) if core.sales_summary else 0
    )

    analysis_window_days = None
    if core.sales_summary:
        try:
            start_date = date.fromisoformat(core.sales_summary.period_start)
            end_date = date.fromisoformat(core.sales_summary.period_end)
            analysis_window_days = max((end_date - start_date).days + 1, 1)
        except ValueError:
            analysis_window_days = None

    total_revenue = sum(item.total_revenue for item in core.matrix_items)
    top_revenue = sum(item.total_revenue for item in sorted_items[:3])
    top_item_revenue_share_ratio = _safe_ratio(top_revenue, total_revenue)

    category_qty: dict[str, float] = {}
    for item in core.matrix_items:
        category = item.menu_category or "Uncategorized"
        category_qty[category] = category_qty.get(category, 0.0) + item.quantity
    sorted_categories = sorted(category_qty.items(), key=lambda kv: kv[1], reverse=True)
    primary_category = sorted_categories[0][0] if sorted_categories else "Uncategorized"

    intent_hints = [
        "quick_daily_purchase",
        "after_work_treat",
        "social_sharing_occasions",
    ]
    if primary_category.lower() == "beverages":
        intent_hints.append("beverage_led_occasions")

    return AudienceFeatures(
        top_items=top_items,
        peak_hours=peak_hours,
        weekday_bias=weekday_bias,
        daypart_profile=daypart_profile,
        weekday_profile=weekday_profile,
        party_size_signal=party_size_signal,
        social_dining_score=social_dining_score,
        avg_order_items=avg_order_items,
        avg_order_revenue=avg_order_revenue,
        top_item_revenue_share_ratio=top_item_revenue_share_ratio,
        popularity_index_coverage=popularity_index_coverage,
        primary_category=primary_category,
        analysis_window_days=analysis_window_days,
        intent_hints=intent_hints,
    )


class AudienceFeatureProvider:
    name = "audience"

    def build(
        self,
        core: CoreInputs,
        shared: object | None = None,
    ) -> AudienceFeatures:
        return build_audience_features(core, shared)


register_provider(AudienceFeatureProvider())
