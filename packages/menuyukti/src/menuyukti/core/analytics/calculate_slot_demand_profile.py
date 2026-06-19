"""Venue-level demand index per day × meal-period slot.

Each slot's demand index is order share relative to the average slot (1.0 = average
traffic across all 35 day × meal-period cells).
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Literal, TypedDict

import pandas as pd

from menuyukti.core.analytics.calculate_combo_pair_timing import ComboPairTimingResult
from menuyukti.core.analytics.meal_periods import (
    MEAL_PERIODS,
    WEEKDAY_ORDER,
    meal_period_hours_range,
    meal_period_short_label,
)
from menuyukti.core.analytics.slot_keys import slot_key

RelativeDemand = Literal["low", "average", "high"]
PromoPosture = Literal["support", "promote", "maintain", "insufficient_data"]

LOW_DEMAND_THRESHOLD = 0.9
HIGH_DEMAND_THRESHOLD = 1.1
SLOT_COUNT = len(WEEKDAY_ORDER) * len(MEAL_PERIODS)
MEAN_SLOT_TRAFFIC_SHARE = 1.0 / SLOT_COUNT


class OrderRowForSlotDemand(TypedDict):
    """Minimum fields for slot demand profile."""

    bill_number: str
    order_time: datetime


class SlotDemandCell(TypedDict):
    day: str
    meal_period: str
    meal_period_label: str
    meal_period_hours_label: str
    order_count: int
    traffic_share: float
    demand_index: float
    relative_demand: RelativeDemand


class PromoPostureResult(TypedDict):
    promo_posture: PromoPosture
    peak_day: str | None
    peak_meal_period: str | None
    pair_co_order_index: float | None
    venue_demand_index: float | None
    venue_relative_demand: RelativeDemand | None
    promo_reason: str


def _relative_demand(demand_index: float) -> RelativeDemand:
    if demand_index < LOW_DEMAND_THRESHOLD:
        return "low"
    if demand_index > HIGH_DEMAND_THRESHOLD:
        return "high"
    return "average"


def _posture_from_relative(relative: RelativeDemand) -> PromoPosture:
    if relative == "high":
        return "support"
    if relative == "low":
        return "promote"
    return "maintain"


def _day_label(day: str) -> str:
    labels = {
        "mon": "Mon",
        "tue": "Tue",
        "wed": "Wed",
        "thu": "Thu",
        "fri": "Fri",
        "sat": "Sat",
        "sun": "Sun",
    }
    return labels.get(day, day.title())


def _format_peak_window(day: str | None, meal_label: str | None) -> str:
    if day and meal_label:
        return f"{_day_label(day)} {meal_label}"
    if meal_label:
        return meal_label
    if day:
        return _day_label(day)
    return "this window"


def _relative_demand_phrase(relative: RelativeDemand) -> str:
    if relative == "low":
        return "below average"
    if relative == "high":
        return "above average"
    return "average"


def _build_promo_reason(
    *,
    peak_window: str,
    pair_index: float | None,
    venue_index: float | None,
    relative: RelativeDemand | None,
    posture: PromoPosture,
) -> str:
    if posture == "insufficient_data":
        return "Not enough co-orders in the peak slot to recommend a promo posture."

    index_part = f" ({pair_index:.2f}×)" if pair_index is not None else ""
    venue_part = ""
    if venue_index is not None and relative is not None:
        venue_part = f" Venue demand {venue_index:.2f} ({_relative_demand_phrase(relative)})."

    if posture == "support":
        action = "Support with hero content in this window."
    elif posture == "promote":
        action = "Promote combo content in this window."
    else:
        action = "Maintain steady content in this window."

    return f"Pair peaks {peak_window}{index_part}.{venue_part} {action}"


def calculate_slot_demand_profile(df: pd.DataFrame) -> list[SlotDemandCell]:
    """Compute venue demand index for each day × meal-period slot."""
    if df.empty:
        return []

    require = {"bill_number", "order_time"}
    missing = require - set(df.columns)
    if missing:
        msg = f"slot demand profile missing columns: {sorted(missing)}"
        raise ValueError(msg)

    work = df.copy()
    work["order_time"] = pd.to_datetime(work["order_time"], utc=True)
    work["bill_number"] = work["bill_number"].astype(str)

    bill_time: dict[str, datetime] = {}
    for row in work.itertuples(index=False):
        bn = str(row.bill_number)
        ot = row.order_time.to_pydatetime() if hasattr(row.order_time, "to_pydatetime") else row.order_time
        if bn not in bill_time or ot < bill_time[bn]:
            bill_time[bn] = ot

    total_orders = len(bill_time)
    if total_orders == 0:
        return []

    slot_order_counts: dict[tuple[str, str], int] = defaultdict(int)

    for dt in bill_time.values():
        day, period = slot_key(dt)
        slot_order_counts[(day, period)] += 1

    cells: list[SlotDemandCell] = []
    for day in WEEKDAY_ORDER:
        for period, _, _hours in MEAL_PERIODS:
            order_count = slot_order_counts.get((day, period), 0)
            traffic_share = order_count / total_orders
            # Compare to the average day × meal-period slot (1 / 35). Using
            # day_share × period_share inflates sparse slots (e.g. breakfast) when
            # marginal shares are tiny but a few orders land in the cell.
            demand_index = (
                traffic_share / MEAN_SLOT_TRAFFIC_SHARE if MEAN_SLOT_TRAFFIC_SHARE > 0 else 0.0
            )
            relative = _relative_demand(demand_index)

            cells.append(
                SlotDemandCell(
                    day=day,
                    meal_period=period,
                    meal_period_label=meal_period_short_label(period),
                    meal_period_hours_label=meal_period_hours_range(period),
                    order_count=order_count,
                    traffic_share=round(traffic_share, 4),
                    demand_index=round(demand_index, 4),
                    relative_demand=relative,
                )
            )

    return cells


def compute_slot_demand_profile_from_orders(
    rows: list[OrderRowForSlotDemand],
) -> list[SlotDemandCell]:
    """Typed list entrypoint for GraphQL / agents."""
    if not rows:
        return []
    df = pd.DataFrame([dict(r) for r in rows])
    return calculate_slot_demand_profile(df)


def _slot_profile_lookup(
    slot_profile: list[SlotDemandCell],
) -> dict[tuple[str, str], SlotDemandCell]:
    return {(cell["day"], cell["meal_period"]): cell for cell in slot_profile}


def derive_combo_promo_posture(
    timing: ComboPairTimingResult,
    slot_profile: list[SlotDemandCell],
) -> PromoPostureResult:
    """Classify promote vs support for the pair's peak window using venue slot health."""
    window = timing["recommended_window"]
    peak_day = window.get("best_day")
    peak_period = window.get("best_meal_period")
    peak_label = window.get("best_meal_period_label")
    sample = int(window.get("sample_co_orders") or 0)
    pair_index = window.get("co_order_index")

    empty: PromoPostureResult = {
        "promo_posture": "insufficient_data",
        "peak_day": peak_day,
        "peak_meal_period": peak_period,
        "pair_co_order_index": pair_index,
        "venue_demand_index": None,
        "venue_relative_demand": None,
        "promo_reason": _build_promo_reason(
            peak_window=_format_peak_window(peak_day, peak_label),
            pair_index=pair_index,
            venue_index=None,
            relative=None,
            posture="insufficient_data",
        ),
    }

    if not peak_day or not peak_period or sample < 1:
        return empty

    venue_cell = _slot_profile_lookup(slot_profile).get((peak_day, peak_period))
    if venue_cell is None:
        return empty

    relative = venue_cell["relative_demand"]
    posture = _posture_from_relative(relative)
    peak_window = _format_peak_window(peak_day, peak_label)

    return {
        "promo_posture": posture,
        "peak_day": peak_day,
        "peak_meal_period": peak_period,
        "pair_co_order_index": pair_index,
        "venue_demand_index": venue_cell["demand_index"],
        "venue_relative_demand": relative,
        "promo_reason": _build_promo_reason(
            peak_window=peak_window,
            pair_index=pair_index,
            venue_index=venue_cell["demand_index"],
            relative=relative,
            posture=posture,
        ),
    }
