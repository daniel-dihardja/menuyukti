from app.marketing_engine.core.models.heatmap import MenuHeatmap
from app.marketing_engine.shared.primitives.behavioral_primitives import (
    BehavioralPrimitives,
)


def compute_behavioral_primitives(
    heatmap: MenuHeatmap,
) -> BehavioralPrimitives:

    hourly = heatmap.daily_heatmap
    total = sum(h.quantity for h in hourly) or 1

    peak = max(hourly, key=lambda h: h.quantity)

    top_hours = sorted(hourly, key=lambda h: h.quantity, reverse=True)[:3]
    concentration = sum(h.quantity for h in top_hours) / total

    weekday_total = sum(
        d.quantity for d in heatmap.weekly_heatmap if d.day not in ["sat", "sun"]
    )

    dead_hours = sum(1 for h in hourly if (h.quantity / total) < 0.02)

    return BehavioralPrimitives(
        peak_hour=peak.hour,
        peak_share=peak.quantity / total,
        demand_concentration=concentration,
        weekday_share=weekday_total / total,
        dead_hours=dead_hours,
    )
