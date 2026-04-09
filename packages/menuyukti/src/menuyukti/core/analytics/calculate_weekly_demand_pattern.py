"""Week-level demand indices from order facts (bill-level revenue per ISO week)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal, TypedDict

import pandas as pd


class OrderRowForWeeklyDemand(TypedDict):
    """Minimum fields from order_fact for weekly demand."""

    bill_number: str
    order_time: datetime
    total_after_bill_discount: float


class WeeklyDemandPatternRow(TypedDict):
    iso_week: str
    week_label: str
    revenue_index: float
    tx_index: float
    relative_demand: Literal["low", "average", "high"]


def calculate_weekly_demand_pattern(df: pd.DataFrame) -> list[WeeklyDemandPatternRow]:
    """
    Group bill-level revenue and transaction counts by ISO week (year + week number).

    Indices are normalized to the mean week within the series (1.0 = average).
    """
    if df.empty:
        return []

    require = {"bill_number", "order_time", "total_after_bill_discount"}
    missing = require - set(df.columns)
    if missing:
        msg = f"weekly demand pattern missing columns: {sorted(missing)}"
        raise ValueError(msg)

    work = df.copy()
    work["order_time"] = pd.to_datetime(work["order_time"], utc=True)
    work["bill_number"] = work["bill_number"].astype(str)
    work["total_after_bill_discount"] = pd.to_numeric(
        work["total_after_bill_discount"], errors="coerce"
    ).fillna(0.0)

    bills = work.groupby("bill_number", as_index=False).agg(
        revenue=("total_after_bill_discount", "sum"),
        order_time=("order_time", "min"),
    )
    iso = bills["order_time"].dt.isocalendar()
    bills["iso_year"] = iso.year.astype(int)
    bills["iso_week"] = iso.week.astype(int)
    bills["iso_week_key"] = (
        bills["iso_year"].astype(str) + "-W" + bills["iso_week"].astype(str).str.zfill(2)
    )

    weekly = (
        bills.groupby(["iso_year", "iso_week", "iso_week_key"], as_index=False)
        .agg(revenue=("revenue", "sum"), transactions=("bill_number", "count"))
        .sort_values(["iso_year", "iso_week"])
    )

    if weekly.empty:
        return []

    mean_rev = float(weekly["revenue"].mean()) or 1.0
    mean_tx = float(weekly["transactions"].mean()) or 1.0

    out: list[WeeklyDemandPatternRow] = []
    for _, row in weekly.iterrows():
        rev_idx = float(row["revenue"]) / mean_rev
        tx_idx = float(row["transactions"]) / mean_tx
        blend = (rev_idx + tx_idx) / 2.0
        if blend < 0.9:
            rel: Literal["low", "average", "high"] = "low"
        elif blend > 1.1:
            rel = "high"
        else:
            rel = "average"
        out.append(
            WeeklyDemandPatternRow(
                iso_week=str(row["iso_week_key"]),
                week_label=str(row["iso_week_key"]),
                revenue_index=round(rev_idx, 4),
                tx_index=round(tx_idx, 4),
                relative_demand=rel,
            )
        )
    return out


def compute_weekly_demand_pattern_from_orders(
    rows: list[OrderRowForWeeklyDemand],
) -> list[WeeklyDemandPatternRow]:
    """Typed list entrypoint for GraphQL / agents."""
    if not rows:
        return []
    df = pd.DataFrame([dict(r) for r in rows])
    return calculate_weekly_demand_pattern(df)
