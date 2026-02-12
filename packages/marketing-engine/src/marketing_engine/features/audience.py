from __future__ import annotations

from datetime import date

from pydantic import BaseModel

from marketing_engine.core.inputs import CoreInputs
from marketing_engine.features import register_provider
from marketing_engine.shared.primitives import SharedPrimitives


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


def _safe_ratio(part: float, total: float) -> float:
    if total <= 0:
        return 0.0
    return part / total


def build_audience_features(
    core: CoreInputs,
    shared: SharedPrimitives | None = None,
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
        shared: SharedPrimitives | None = None,
    ) -> AudienceFeatures:
        return build_audience_features(core, shared)


register_provider(AudienceFeatureProvider())
