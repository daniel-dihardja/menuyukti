"""Co-order timing for menu combo pairs: when guests order items together."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Literal, TypedDict

import pandas as pd

from menuyukti.core.analytics.meal_periods import (
    MEAL_PERIODS,
    WEEKDAY_ORDER,
    meal_period_hours_range,
    meal_period_short_label,
)
from menuyukti.core.analytics.slot_keys import slot_key

MIN_SLOT_CO_ORDERS = 3
ConfidenceTier = Literal["high", "medium", "low", "insufficient"]


class OrderRowForComboTiming(TypedDict):
    """One order line for combo pair timing."""

    bill_number: str
    menu: str
    order_time: datetime


class ComboPairInput(TypedDict):
    menu_a: str
    menu_b: str


class ComboPairTimingCell(TypedDict):
    day: str
    meal_period: str
    meal_period_label: str
    meal_period_hours_label: str
    co_order_count: int
    co_order_index: float
    attach_rate: float


class ComboPairTimingHour(TypedDict):
    hour: int
    co_order_count: int


class ComboPairRecommendedWindow(TypedDict):
    best_day: str | None
    best_meal_period: str | None
    best_meal_period_label: str | None
    best_meal_period_hours_label: str | None
    peak_hour: int | None
    co_order_index: float | None
    sample_co_orders: int
    confidence_tier: ConfidenceTier


class ComboPairTimingResult(TypedDict):
    menu_a: str
    menu_b: str
    recommended_window: ComboPairRecommendedWindow
    day_meal_cells: list[ComboPairTimingCell]
    hourly_co_orders: list[ComboPairTimingHour]


def _empty_recommended_window() -> ComboPairRecommendedWindow:
    return {
        "best_day": None,
        "best_meal_period": None,
        "best_meal_period_label": None,
        "best_meal_period_hours_label": None,
        "peak_hour": None,
        "co_order_index": None,
        "sample_co_orders": 0,
        "confidence_tier": "insufficient",
    }


def _confidence_tier(sample: int) -> ConfidenceTier:
    if sample >= 10:
        return "high"
    if sample >= 5:
        return "medium"
    if sample >= MIN_SLOT_CO_ORDERS:
        return "low"
    return "insufficient"


def _bill_menus_and_times(
    df: pd.DataFrame,
) -> tuple[dict[str, frozenset[str]], dict[str, datetime]]:
    bill_menus: dict[str, set[str]] = defaultdict(set)
    bill_time: dict[str, datetime] = {}

    for row in df.itertuples(index=False):
        bn = str(row.bill_number)
        menu = str(row.menu).strip()
        if menu:
            bill_menus[bn].add(menu)
        ot = row.order_time
        if bn not in bill_time or ot < bill_time[bn]:
            bill_time[bn] = ot

    return (
        {bn: frozenset(menus) for bn, menus in bill_menus.items()},
        bill_time,
    )


def _compute_pair_timing(
    *,
    menu_a: str,
    menu_b: str,
    bill_menus: dict[str, frozenset[str]],
    bill_time: dict[str, datetime],
    slot_order_counts: dict[tuple[str, str], int],
    total_orders: int,
) -> ComboPairTimingResult:
    pair_set = frozenset({menu_a, menu_b})
    co_order_bills = [
        bn for bn, menus in bill_menus.items() if pair_set <= menus and bn in bill_time
    ]

    if not co_order_bills:
        return {
            "menu_a": menu_a,
            "menu_b": menu_b,
            "recommended_window": _empty_recommended_window(),
            "day_meal_cells": [],
            "hourly_co_orders": [{"hour": h, "co_order_count": 0} for h in range(24)],
        }

    pair_total = len(co_order_bills)
    pair_slot_counts: dict[tuple[str, str], int] = defaultdict(int)
    pair_slot_menu_a: dict[tuple[str, str], int] = defaultdict(int)
    hourly_counts: dict[int, int] = defaultdict(int)
    slot_hour_counts: dict[tuple[str, str, int], int] = defaultdict(int)

    for bn in co_order_bills:
        dt = bill_time[bn]
        slot = slot_key(dt)
        pair_slot_counts[slot] += 1
        hourly_counts[dt.hour] += 1
        slot_hour_counts[(slot[0], slot[1], dt.hour)] += 1

    for bn, menus in bill_menus.items():
        if menu_a not in menus or bn not in bill_time:
            continue
        pair_slot_menu_a[slot_key(bill_time[bn])] += 1

    day_meal_cells: list[ComboPairTimingCell] = []
    for day in WEEKDAY_ORDER:
        for period, _, _hours in MEAL_PERIODS:
            slot = (day, period)
            co_count = pair_slot_counts.get(slot, 0)
            all_in_slot = slot_order_counts.get(slot, 0)
            menu_a_in_slot = pair_slot_menu_a.get(slot, 0)

            pair_share = co_count / pair_total if pair_total else 0.0
            traffic_share = all_in_slot / total_orders if total_orders else 0.0
            co_index = pair_share / traffic_share if traffic_share > 0 else 0.0
            attach = co_count / menu_a_in_slot if menu_a_in_slot > 0 else 0.0

            day_meal_cells.append(
                {
                    "day": day,
                    "meal_period": period,
                    "meal_period_label": meal_period_short_label(period),
                    "meal_period_hours_label": meal_period_hours_range(period),
                    "co_order_count": co_count,
                    "co_order_index": co_index,
                    "attach_rate": attach,
                }
            )

    index_candidates = [
        c for c in day_meal_cells if c["co_order_count"] > 0 and c["co_order_index"] > 0
    ]
    if index_candidates:
        best = max(
            index_candidates,
            key=lambda c: (
                c["co_order_index"],
                c["co_order_count"],
                -WEEKDAY_ORDER.index(c["day"]),
            ),
        )
        peak_hour: int | None = None
        best_slot_hours = [
            (hour, count)
            for (d, p, hour), count in slot_hour_counts.items()
            if d == best["day"] and p == best["meal_period"] and count > 0
        ]
        if best_slot_hours:
            peak_hour = max(best_slot_hours, key=lambda x: x[1])[0]

        recommended: ComboPairRecommendedWindow = {
            "best_day": best["day"],
            "best_meal_period": best["meal_period"],
            "best_meal_period_label": meal_period_short_label(best["meal_period"]),
            "best_meal_period_hours_label": meal_period_hours_range(best["meal_period"]),
            "peak_hour": peak_hour,
            "co_order_index": best["co_order_index"],
            "sample_co_orders": best["co_order_count"],
            "confidence_tier": _confidence_tier(best["co_order_count"]),
        }
    else:
        recommended = _empty_recommended_window()

    return {
        "menu_a": menu_a,
        "menu_b": menu_b,
        "recommended_window": recommended,
        "day_meal_cells": day_meal_cells,
        "hourly_co_orders": [
            {"hour": h, "co_order_count": hourly_counts.get(h, 0)} for h in range(24)
        ],
    }


def calculate_combo_pair_timing(
    df: pd.DataFrame,
    pairs: list[ComboPairInput],
) -> list[ComboPairTimingResult]:
    """Compute timing analytics for each menu pair."""
    if df.empty or not pairs:
        return []

    bill_menus, bill_time = _bill_menus_and_times(df)
    total_orders = len(bill_time)
    if total_orders == 0:
        return []

    slot_order_counts: dict[tuple[str, str], int] = defaultdict(int)
    for bn, dt in bill_time.items():
        slot_order_counts[slot_key(dt)] += 1

    results: list[ComboPairTimingResult] = []
    for pair in pairs:
        results.append(
            _compute_pair_timing(
                menu_a=pair["menu_a"],
                menu_b=pair["menu_b"],
                bill_menus=bill_menus,
                bill_time=bill_time,
                slot_order_counts=slot_order_counts,
                total_orders=total_orders,
            )
        )

    return results


def compute_combo_pair_timing_from_orders(
    order_rows: list[OrderRowForComboTiming],
    pairs: list[ComboPairInput],
) -> list[ComboPairTimingResult]:
    """Build a DataFrame from order rows and compute combo pair timing."""
    if not order_rows or not pairs:
        return []

    df = pd.DataFrame(order_rows)
    df["order_time"] = pd.to_datetime(df["order_time"], utc=True)
    return calculate_combo_pair_timing(df, pairs)
