"""Transform GraphQL slot demand profile into IGPlan slot performance payload."""

from __future__ import annotations

from typing import Any

from menuyukti.core.analytics import SlotDemandCell, summarize_venue_slot_performance


def graphql_slot_profile_to_cells(raw: list[Any]) -> list[SlotDemandCell]:
    cells: list[SlotDemandCell] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        day = str(row.get("day") or "").strip()
        meal_period = str(row.get("mealPeriod") or row.get("meal_period") or "").strip()
        if not day or not meal_period:
            continue
        relative = str(row.get("relativeDemand") or row.get("relative_demand") or "average")
        if relative not in {"low", "average", "high"}:
            relative = "average"
        cells.append(
            SlotDemandCell(
                day=day,
                meal_period=meal_period,
                meal_period_label=str(
                    row.get("mealPeriodLabel") or row.get("meal_period_label") or meal_period
                ),
                meal_period_hours_label=str(
                    row.get("mealPeriodHoursLabel") or row.get("meal_period_hours_label") or ""
                ),
                order_count=int(row.get("orderCount") or row.get("order_count") or 0),
                traffic_share=float(row.get("trafficShare") or row.get("traffic_share") or 0.0),
                demand_index=float(row.get("demandIndex") or row.get("demand_index") or 0.0),
                relative_demand=relative,  # type: ignore[typeddict-item]
            )
        )
    return cells


def build_slot_performance_payload(signals_raw: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(signals_raw, dict):
        return None
    profile_raw = signals_raw.get("slot_demand_profile")
    if not isinstance(profile_raw, list) or not profile_raw:
        return None
    cells = graphql_slot_profile_to_cells(profile_raw)
    summary = summarize_venue_slot_performance(cells)
    if summary is None:
        return None
    return {
        "slots": [
            {
                "day": slot["day"],
                "mealPeriod": slot["meal_period"],
                "mealPeriodLabel": slot["meal_period_label"],
                "mealPeriodHoursLabel": slot["meal_period_hours_label"],
                "orderCount": slot["order_count"],
                "demandIndex": slot["demand_index"],
                "relativeDemand": slot["relative_demand"],
                "posture": slot["posture"],
            }
            for slot in summary["slots"]
        ],
        "strongSlots": summary["strong_slots"],
        "slotsNeedingPromotion": summary["slots_needing_promotion"],
        "summary": summary["summary"],
    }
