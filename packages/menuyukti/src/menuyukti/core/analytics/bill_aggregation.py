"""Shared bill-level aggregation helpers for analytics pipelines."""

from __future__ import annotations

from datetime import datetime

import pandas as pd


def bill_min_order_times(df: pd.DataFrame) -> dict[str, datetime]:
    """
    Map each ``bill_number`` to its earliest ``order_time``.

    Expects columns ``bill_number`` and ``order_time`` (datetime-like).
    """
    bills = (
        df.groupby("bill_number", sort=False)["order_time"]
        .min()
        .dropna()
    )
    out: dict[str, datetime] = {}
    for bn, ot in bills.items():
        if hasattr(ot, "to_pydatetime"):
            out[str(bn)] = ot.to_pydatetime()
        else:
            out[str(bn)] = ot
    return out


def bill_menus_and_min_times(
    df: pd.DataFrame,
) -> tuple[dict[str, frozenset[str]], dict[str, datetime]]:
    """
    Aggregate unique menus and earliest ``order_time`` per bill.

    Expects columns ``bill_number``, ``menu``, and ``order_time``.
    """
    work = df.copy()
    work["bill_number"] = work["bill_number"].astype(str)
    work["menu"] = work["menu"].astype(str).str.strip()
    work = work[work["menu"] != ""]

    times = bill_min_order_times(work)

    menus_series = work.groupby("bill_number", sort=False)["menu"].agg(
        lambda s: frozenset(s.tolist())
    )
    bill_menus = {str(bn): frozenset(menus) for bn, menus in menus_series.items()}
    return bill_menus, times
