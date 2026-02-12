from __future__ import annotations

from datetime import date
from typing import Any

from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from typing_extensions import NotRequired, TypedDict


class AudienceOutputs(TypedDict):
    top_items: list[str]
    peak_hours: list[str]
    weekday_bias: str
    daypart_demand_distribution: str
    weekday_demand_distribution: str
    audience_intent_clusters: list[str]
    party_size_signal: str
    social_dining_probability: str
    audience_mix_summary: str
    analysis_window: str
    popularity_index_summary: str
    top_item_revenue_share: str
    category_mix: str


class AudienceFeatures(TypedDict):
    top_items: list[str]
    peak_hours: list[str]
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
    analysis_window_days: NotRequired[int]
    intent_hints: list[str]


class Context(TypedDict):
    locale: NotRequired[str]
    branch_id: NotRequired[int]
    analytics_id: NotRequired[int]


class State(TypedDict):
    core_input: NotRequired[dict[str, Any]]
    audience_features: NotRequired[AudienceFeatures]
    outputs: NotRequired[AudienceOutputs]
    title: NotRequired[str]


def _format_percentage(part: float, total: float) -> str:
    if total <= 0:
        return "0%"
    return f"{(part / total) * 100:.0f}%"


def _parse_iso_date(value: Any) -> date | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _derive_features(core_input: dict[str, Any]) -> AudienceFeatures:
    matrix_items = core_input.get("matrix_items", [])
    heatmaps = core_input.get("heatmaps", [])
    sales_summary = core_input.get("sales_summary", {})

    # Top items
    sorted_items = sorted(
        matrix_items,
        key=lambda item: float(item.get("quantity", 0)),
        reverse=True,
    )
    top_items = [str(item.get("menu", "")).strip() for item in sorted_items[:3]]
    top_items = [item for item in top_items if item]
    if not top_items:
        top_items = ["No top items available"]

    # Peak hours + daypart distribution
    hourly_counts: dict[int, float] = {}
    for heatmap in heatmaps:
        for row in heatmap.get("daily_heatmap", []):
            hour = int(row.get("hour", 0))
            qty = float(row.get("quantity", 0))
            hourly_counts[hour] = hourly_counts.get(hour, 0.0) + qty

    peak_hours = [
        f"{hour:02d}:00"
        for hour, _ in sorted(hourly_counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
    ]
    if not peak_hours:
        peak_hours = ["No peak-hour data"]

    daypart_totals = {"morning": 0.0, "lunch": 0.0, "afternoon": 0.0, "evening": 0.0}
    for hour, qty in hourly_counts.items():
        if hour < 11:
            daypart_totals["morning"] += qty
        elif hour < 14:
            daypart_totals["lunch"] += qty
        elif hour < 17:
            daypart_totals["afternoon"] += qty
        else:
            daypart_totals["evening"] += qty
    daypart_total_qty = sum(daypart_totals.values())
    daypart_profile = {
        key: (value / daypart_total_qty if daypart_total_qty > 0 else 0.0)
        for key, value in daypart_totals.items()
    }

    # Weekday bias + weekday distribution
    weekday_order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    weekday_counts: dict[str, float] = {day: 0.0 for day in weekday_order}
    for heatmap in heatmaps:
        for row in heatmap.get("weekly_heatmap", []):
            day = str(row.get("day", "")).lower()
            if day in weekday_counts:
                weekday_counts[day] += float(row.get("quantity", 0))

    weekday_total = sum(weekday_counts[day] for day in ["mon", "tue", "wed", "thu", "fri"])
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

    # Party-size and social signal
    avg_order_items = float(sales_summary.get("avg_order_items", 0) or 0)
    if avg_order_items < 1.8:
        party_size_signal = "mostly solo orders"
        social_dining_score = 0.3
    elif avg_order_items < 2.8:
        party_size_signal = "mostly pair orders"
        social_dining_score = 0.6
    else:
        party_size_signal = "group-heavy orders"
        social_dining_score = 0.85

    popularity_index = sales_summary.get("popularity_index", []) or []
    popularity_index_coverage = len(popularity_index) if isinstance(popularity_index, list) else 0

    # Top-item revenue share
    total_revenue = sum(float(item.get("total_revenue", 0) or 0) for item in matrix_items)
    top_revenue = sum(float(item.get("total_revenue", 0) or 0) for item in sorted_items[:3])
    top_item_revenue_share_ratio = (top_revenue / total_revenue) if total_revenue > 0 else 0.0

    # Category mix + primary category
    category_qty: dict[str, float] = {}
    for item in matrix_items:
        category = str(item.get("menu_category") or "Uncategorized")
        category_qty[category] = category_qty.get(category, 0.0) + float(
            item.get("quantity", 0) or 0
        )
    sorted_category_mix = sorted(category_qty.items(), key=lambda kv: kv[1], reverse=True)
    primary_category = sorted_category_mix[0][0] if sorted_category_mix else "Uncategorized"

    # Analysis window (days)
    start_date = _parse_iso_date(sales_summary.get("period_start"))
    end_date = _parse_iso_date(sales_summary.get("period_end"))
    analysis_window_days = None
    if start_date and end_date:
        analysis_window_days = max((end_date - start_date).days + 1, 1)

    # Intent hints are machine-friendly guidance signals
    intent_hints = [
        "quick daily purchase",
        "after-work treat",
        "social sharing occasions",
    ]
    if primary_category.lower() == "beverages":
        intent_hints.append("beverage-led occasions")

    avg_order_revenue = float(sales_summary.get("avg_order_revenue", 0) or 0)

    features: AudienceFeatures = {
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


def _build_outputs(core_input: dict[str, Any], features: AudienceFeatures) -> AudienceOutputs:
    sales_summary = core_input.get("sales_summary", {})
    matrix_items = core_input.get("matrix_items", [])

    daypart_demand_distribution = ", ".join(
        [
            f"Morning {_format_percentage(features['daypart_profile']['morning'], 1.0)}",
            f"Lunch {_format_percentage(features['daypart_profile']['lunch'], 1.0)}",
            f"Afternoon {_format_percentage(features['daypart_profile']['afternoon'], 1.0)}",
            f"Evening {_format_percentage(features['daypart_profile']['evening'], 1.0)}",
        ]
    )
    weekday_demand_distribution = ", ".join(
        [
            f"Mon {_format_percentage(features['weekday_profile']['mon'], 1.0)}",
            f"Tue {_format_percentage(features['weekday_profile']['tue'], 1.0)}",
            f"Wed {_format_percentage(features['weekday_profile']['wed'], 1.0)}",
            f"Thu {_format_percentage(features['weekday_profile']['thu'], 1.0)}",
            f"Fri {_format_percentage(features['weekday_profile']['fri'], 1.0)}",
            f"Sat {_format_percentage(features['weekday_profile']['sat'], 1.0)}",
            f"Sun {_format_percentage(features['weekday_profile']['sun'], 1.0)}",
        ]
    )

    social_dining_probability = (
        "low"
        if features["social_dining_score"] < 0.4
        else "medium"
        if features["social_dining_score"] < 0.75
        else "high"
    )

    period_start = sales_summary.get("period_start")
    period_end = sales_summary.get("period_end")
    analysis_window = (
        f"{period_start} to {period_end}"
        if period_start and period_end
        else "Analysis window unavailable"
    )

    popularity_index_summary = f"{features['popularity_index_coverage']} items scored in popularity index"

    top_item_revenue_share = (
        "Top items contribute "
        f"{_format_percentage(features['top_item_revenue_share_ratio'], 1.0)} of total revenue"
    )

    category_qty: dict[str, float] = {}
    for item in matrix_items:
        category = str(item.get("menu_category") or "Uncategorized")
        category_qty[category] = category_qty.get(category, 0.0) + float(
            item.get("quantity", 0) or 0
        )
    total_qty = sum(category_qty.values())
    sorted_category_mix = sorted(category_qty.items(), key=lambda kv: kv[1], reverse=True)
    category_mix = ", ".join(
        [f"{name} {_format_percentage(qty, total_qty)}" for name, qty in sorted_category_mix[:4]]
    )
    if not category_mix:
        category_mix = "Category mix unavailable"

    audience_mix_summary = (
        f"{features['weekday_bias'].title()} demand with {features['party_size_signal']} "
        f"and {social_dining_probability} social intent."
    )

    return {
        "top_items": features["top_items"],
        "peak_hours": features["peak_hours"],
        "weekday_bias": features["weekday_bias"],
        "daypart_demand_distribution": daypart_demand_distribution,
        "weekday_demand_distribution": weekday_demand_distribution,
        "audience_intent_clusters": features["intent_hints"][:3],
        "party_size_signal": features["party_size_signal"],
        "social_dining_probability": social_dining_probability,
        "audience_mix_summary": audience_mix_summary,
        "analysis_window": analysis_window,
        "popularity_index_summary": popularity_index_summary,
        "top_item_revenue_share": top_item_revenue_share,
        "category_mix": category_mix,
    }


async def run_audience_agent(state: State, runtime: Runtime[Context]) -> dict[str, Any]:
    core_input = state.get("core_input", {})
    audience_features = _derive_features(core_input)
    outputs = _build_outputs(core_input, audience_features)
    analytics_id = (runtime.context or {}).get("analytics_id")

    return {
        "audience_features": audience_features,
        "outputs": outputs,
        "title": f"audience-agent-{analytics_id}" if analytics_id is not None else "audience-agent",
    }


graph = (
    StateGraph(State, context_schema=Context)
    .add_node("run_audience_agent", run_audience_agent)
    .add_edge("__start__", "run_audience_agent")
    .compile(name="AudienceAgentGraph")
)
