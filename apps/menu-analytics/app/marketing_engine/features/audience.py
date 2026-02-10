from __future__ import annotations

from pydantic import BaseModel

from app.marketing_engine.core.inputs import CoreInputs
from app.marketing_engine.shared.primitives import SharedPrimitives


class AudienceFeatures(BaseModel):
    """
    Agent-specific features for audience definition.
    """

    top_items: list[str]
    peak_hours: list[int]
    weekday_bias: str


def build_audience_features(
    core: CoreInputs,
    shared: SharedPrimitives | None = None,
) -> AudienceFeatures:
    """
    Build audience-oriented features from core inputs.
    """

    # Top items by quantity
    top_items = [
        item.menu
        for item in sorted(
            core.matrix_items,
            key=lambda i: i.quantity,
            reverse=True,
        )
    ][:5]

    # Aggregate peak hours from heatmaps
    hour_counts: dict[int, int] = {}
    for hm in core.heatmaps:
        for h in hm.daily_heatmap:
            hour_counts[h.hour] = hour_counts.get(h.hour, 0) + h.quantity

    peak_hours = [
        hour
        for hour, _ in sorted(
            hour_counts.items(),
            key=lambda kv: kv[1],
            reverse=True,
        )
    ][:3]

    # Weekday bias
    weekday_total = 0
    weekend_total = 0
    for hm in core.heatmaps:
        for w in hm.weekly_heatmap:
            if w.day in {"sat", "sun"}:
                weekend_total += w.quantity
            else:
                weekday_total += w.quantity

    if weekday_total > weekend_total:
        weekday_bias = "weekday"
    elif weekend_total > weekday_total:
        weekday_bias = "weekend"
    else:
        weekday_bias = "balanced"

    return AudienceFeatures(
        top_items=top_items,
        peak_hours=peak_hours,
        weekday_bias=weekday_bias,
    )
