from __future__ import annotations

from typing import Any, cast

from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from marketing_engine.features.audience import derive_audience_features_from_core_input
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


AUDIENCE_CONFIG = {
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
    "social_dining_probability_thresholds": {
        "low_max_score": 0.4,
        "medium_max_score": 0.75,
    },
    "category_mix_limit": 4,
    "audience_intent_clusters_limit": 3,
}


def _format_percentage(part: float, total: float) -> str:
    if total <= 0:
        return "0%"
    return f"{(part / total) * 100:.0f}%"


def _build_outputs(
    core_input: dict[str, Any], features: AudienceFeatures
) -> AudienceOutputs:
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
        if features["social_dining_score"]
        < AUDIENCE_CONFIG["social_dining_probability_thresholds"]["low_max_score"]
        else (
            "medium"
            if features["social_dining_score"]
            < AUDIENCE_CONFIG["social_dining_probability_thresholds"][
                "medium_max_score"
            ]
            else "high"
        )
    )

    period_start = sales_summary.get("period_start")
    period_end = sales_summary.get("period_end")
    analysis_window = (
        f"{period_start} to {period_end}"
        if period_start and period_end
        else "Analysis window unavailable"
    )

    popularity_index_summary = (
        f"{features['popularity_index_coverage']} items scored in popularity index"
    )

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
    sorted_category_mix = sorted(
        category_qty.items(), key=lambda kv: kv[1], reverse=True
    )
    category_mix = ", ".join(
        [
            f"{name} {_format_percentage(qty, total_qty)}"
            for name, qty in sorted_category_mix[
                : AUDIENCE_CONFIG["category_mix_limit"]
            ]
        ]
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
        "audience_intent_clusters": features["intent_hints"][
            : AUDIENCE_CONFIG["audience_intent_clusters_limit"]
        ],
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
    audience_features = cast(
        AudienceFeatures, derive_audience_features_from_core_input(core_input)
    )
    outputs = _build_outputs(core_input, audience_features)
    analytics_id = (runtime.context or {}).get("analytics_id")

    return {
        "audience_features": audience_features,
        "outputs": outputs,
        "title": (
            f"audience-agent-{analytics_id}"
            if analytics_id is not None
            else "audience-agent"
        ),
    }


graph = (
    StateGraph(State, context_schema=Context)
    .add_node("run_audience_agent", run_audience_agent)
    .add_edge("__start__", "run_audience_agent")
    .compile(name="AudienceAgentGraph")
)
