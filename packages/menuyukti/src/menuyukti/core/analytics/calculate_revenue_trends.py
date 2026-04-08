"""Period-over-period revenue trends per menu item."""

from __future__ import annotations

from typing import Literal, TypedDict

import numpy as np
import pandas as pd

from menuyukti.core.analytics.frame_contracts import (
    require_columns,
    revenue_trends_columns,
)
from menuyukti.core.models.pos_transaction import POSTransactionLineItem

_COL = POSTransactionLineItem

TrendLabel = Literal["new_entry", "rising", "declining", "stable"]


class OrderRowForRevenueTrends(TypedDict):
    """Line-item row; only ``menu`` and ``total_after_bill_discount`` are required for trends."""

    menu: str
    total_after_bill_discount: float


class RevenueTrendRow(TypedDict):
    """Per-menu comparison between current and previous periods."""

    menu: str
    current_revenue: float
    previous_revenue: float
    revenue_delta: float
    pct_change: float | None
    current_rank: int
    previous_rank: int
    rank_change: int
    trend_label: TrendLabel


class RevenueTrendsResult(TypedDict):
    """Trend rows plus period totals for headline copy."""

    rows: list[RevenueTrendRow]
    current_period_total_revenue: float
    previous_period_total_revenue: float


def _rank_by_revenue(s: pd.Series) -> pd.Series:
    """1-based rank: 1 = highest revenue. Ties: lower alphabetical menu name wins earlier rank."""
    out = s.astype(float)
    df = out.reset_index()
    menu_col, rev_col = df.columns[0], df.columns[1]
    df = df.sort_values(
        by=[rev_col, menu_col],
        ascending=[False, True],
        kind="mergesort",
    )
    df["_rank"] = np.arange(1, len(df) + 1)
    ranks = df.set_index(menu_col)["_rank"]
    return ranks.reindex(out.index)


def calculate_revenue_trends(
    df_current: pd.DataFrame, df_previous: pd.DataFrame
) -> RevenueTrendsResult:
    """
    Compare per-menu revenue between two periods.

    ``df_current`` and ``df_previous`` must each have columns
    ``menu`` and ``total_after_bill_discount``. Rows are line items; revenue is summed per menu.

    Trend labels (``trend_label``):
    - ``new_entry``: previous revenue is 0 and current is positive
    - ``rising``: previous > 0 and pct_change >= 10%
    - ``declining``: previous > 0 and pct_change <= -10%
    - ``stable``: otherwise
    """
    require_columns(
        df_current,
        revenue_trends_columns(),
        context="calculate_revenue_trends:current",
    )
    require_columns(
        df_previous,
        revenue_trends_columns(),
        context="calculate_revenue_trends:previous",
    )
    if df_current.empty:
        raise ValueError("df_current is empty. Cannot calculate revenue trends.")

    curr = df_current.groupby(_COL.MENU, observed=True)[
        _COL.TOTAL_AFTER_BILL_DISCOUNT
    ].sum()
    prev = (
        df_previous.groupby(_COL.MENU, observed=True)[
            _COL.TOTAL_AFTER_BILL_DISCOUNT
        ].sum()
        if not df_previous.empty
        else pd.Series(dtype=float)
    )

    all_menus = curr.index.union(prev.index)
    curr = curr.reindex(all_menus, fill_value=0.0)
    prev = prev.reindex(all_menus, fill_value=0.0)

    current_total = float(curr.sum())
    previous_total = float(prev.sum())

    trends = pd.DataFrame(
        {
            "current_revenue": curr,
            "previous_revenue": prev,
        }
    )
    trends["revenue_delta"] = trends["current_revenue"] - trends["previous_revenue"]
    trends["pct_change"] = np.where(
        trends["previous_revenue"] > 0,
        trends["revenue_delta"] / trends["previous_revenue"],
        np.nan,
    )

    curr_ranks = _rank_by_revenue(trends["current_revenue"])
    prev_ranks = _rank_by_revenue(trends["previous_revenue"])
    trends["current_rank"] = curr_ranks
    trends["previous_rank"] = prev_ranks
    trends["rank_change"] = (trends["previous_rank"] - trends["current_rank"]).astype(
        int
    )

    pc = trends["pct_change"]
    pr = trends["previous_revenue"]
    trends["trend_label"] = np.select(
        [
            (pr == 0) & (trends["current_revenue"] > 0),
            (pr > 0) & (pc >= 0.1),
            (pr > 0) & (pc <= -0.1),
        ],
        ["new_entry", "rising", "declining"],
        default="stable",
    )

    rows: list[RevenueTrendRow] = []
    for menu, r in trends.iterrows():
        pct = r["pct_change"]
        rows.append(
            RevenueTrendRow(
                menu=str(menu),
                current_revenue=round(float(r["current_revenue"]), 4),
                previous_revenue=round(float(r["previous_revenue"]), 4),
                revenue_delta=round(float(r["revenue_delta"]), 4),
                pct_change=None if np.isnan(pct) else round(float(pct), 6),
                current_rank=int(r["current_rank"]),
                previous_rank=int(r["previous_rank"]),
                rank_change=int(r["rank_change"]),
                trend_label=_as_trend_label(str(r["trend_label"])),
            )
        )

    rows.sort(key=lambda x: (-x["current_revenue"], x["menu"]))

    return RevenueTrendsResult(
        rows=rows,
        current_period_total_revenue=round(current_total, 4),
        previous_period_total_revenue=round(previous_total, 4),
    )


def _as_trend_label(raw: str) -> TrendLabel:
    if raw in ("new_entry", "rising", "declining", "stable"):
        return raw  # type: ignore[return-value]
    return "stable"


def compute_revenue_trends_from_orders(
    current_rows: list[OrderRowForRevenueTrends],
    previous_rows: list[OrderRowForRevenueTrends],
) -> RevenueTrendsResult:
    """Build DataFrames from order lines and run :func:`calculate_revenue_trends`."""
    if not current_rows:
        raise ValueError("current_rows must not be empty")

    df_curr = pd.DataFrame(current_rows)
    df_prev = (
        pd.DataFrame(previous_rows)
        if previous_rows
        else pd.DataFrame(
            columns=revenue_trends_columns(),
        )
    )
    return calculate_revenue_trends(df_curr, df_prev)
