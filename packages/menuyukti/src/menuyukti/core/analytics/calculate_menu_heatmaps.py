from datetime import datetime
from typing import Literal, NotRequired, TypedDict, cast

import pandas as pd

from menuyukti.core.analytics.frame_contracts import (
    ensure_optional_category_columns,
    heatmap_columns,
    require_columns,
)
from menuyukti.core.analytics.meal_periods import WEEKDAY_ORDER

Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

# Re-export for callers/tests that import WEEKDAY_ORDER from this module.
__all__ = [
    "WEEKDAY_ORDER",
    "Weekday",
    "OrderRowForHeatmap",
    "DailyHeatmapRow",
    "WeeklyHeatmapRow",
    "MenuHeatmapPayload",
    "calculate_menu_heatmaps",
    "compute_menu_heatmaps_from_orders",
]


# ---------------------------------------------------------------------------
# Input: order-level rows for heatmap aggregation
# ---------------------------------------------------------------------------


class OrderRowForHeatmap(TypedDict):
    """One order line. Required: menu, qty, order_time; category fields optional."""

    menu: str
    qty: int | float
    order_time: datetime
    menu_category: NotRequired[str | None]
    menu_category_detail: NotRequired[str | None]


# ---------------------------------------------------------------------------
# Output: heatmap payload structure
# ---------------------------------------------------------------------------


class DailyHeatmapRow(TypedDict):
    hour: int
    quantity: int


class WeeklyHeatmapRow(TypedDict):
    day: Weekday
    quantity: int


class MenuHeatmapPayload(TypedDict):
    menu: str
    menu_category: str | None
    menu_category_detail: str | None
    daily_heatmap: list[DailyHeatmapRow]
    weekly_heatmap: list[WeeklyHeatmapRow]
    reporting_period: str


def _first_unique_or_none(series: pd.Series) -> object | None:
    values = series.dropna().unique()
    if len(values) == 0:
        return None
    return values[0]


def calculate_menu_heatmaps(df: pd.DataFrame) -> list[MenuHeatmapPayload]:
    """
    Calculate daily (hourly) and weekly heatmaps per menu item.

    Expects df to contain:
    - menu
    - qty
    - order_time (datetime)
    - menu_category (optional; filled with None when absent)
    - menu_category_detail (optional; filled with None when absent)
    """
    if df.empty:
        return []

    require_columns(df, heatmap_columns(), context="calculate_menu_heatmaps")
    df = ensure_optional_category_columns(df).copy()

    df["hour"] = df["order_time"].dt.hour
    df["weekday"] = df["order_time"].dt.day_name().str.lower().str[:3]
    reporting_period = df["order_time"].min().strftime("%Y-%m")

    # One category / detail per menu; raise if the pipeline has conflicting values.
    cat_nunique = df.groupby("menu", sort=False)["menu_category"].nunique(dropna=True)
    detail_nunique = df.groupby("menu", sort=False)["menu_category_detail"].nunique(
        dropna=True
    )
    multi_cat = cat_nunique[cat_nunique > 1]
    if not multi_cat.empty:
        menu_item = multi_cat.index[0]
        values = df.loc[df["menu"] == menu_item, "menu_category"].dropna().unique()
        raise ValueError(f"Menu '{menu_item}' has multiple categories: {values}")
    multi_detail = detail_nunique[detail_nunique > 1]
    if not multi_detail.empty:
        menu_item = multi_detail.index[0]
        values = (
            df.loc[df["menu"] == menu_item, "menu_category_detail"].dropna().unique()
        )
        raise ValueError(
            f"Menu '{menu_item}' has multiple category details: {values}"
        )

    categories = (
        df.groupby("menu", sort=False)
        .agg(
            menu_category=("menu_category", _first_unique_or_none),
            menu_category_detail=("menu_category_detail", _first_unique_or_none),
        )
    )

    hourly = (
        df.pivot_table(
            values="qty",
            index="menu",
            columns="hour",
            aggfunc="sum",
            fill_value=0,
        )
        .reindex(columns=range(24), fill_value=0)
    )

    df["weekday"] = pd.Categorical(
        df["weekday"],
        categories=WEEKDAY_ORDER,
        ordered=True,
    )
    weekly = (
        df.pivot_table(
            values="qty",
            index="menu",
            columns="weekday",
            aggfunc="sum",
            fill_value=0,
            observed=False,
        )
        .reindex(columns=WEEKDAY_ORDER, fill_value=0)
    )

    menus = categories.index.tolist()
    heatmap_results: list[MenuHeatmapPayload] = []
    for menu_item in menus:
        hourly_row = hourly.loc[menu_item] if menu_item in hourly.index else None
        weekly_row = weekly.loc[menu_item] if menu_item in weekly.index else None
        cat_row = categories.loc[menu_item]

        daily_heatmap: list[DailyHeatmapRow] = [
            {
                "hour": hour,
                "quantity": int(hourly_row[hour]) if hourly_row is not None else 0,
            }
            for hour in range(24)
        ]
        weekly_heatmap: list[WeeklyHeatmapRow] = [
            {
                "day": cast(Weekday, day),
                "quantity": int(weekly_row[day]) if weekly_row is not None else 0,
            }
            for day in WEEKDAY_ORDER
        ]

        menu_category = cat_row["menu_category"]
        menu_category_detail = cat_row["menu_category_detail"]
        if menu_category is not None and pd.isna(menu_category):
            menu_category = None
        if menu_category_detail is not None and pd.isna(menu_category_detail):
            menu_category_detail = None
        heatmap_results.append(
            {
                "menu": str(menu_item),
                "menu_category": None if menu_category is None else str(menu_category),
                "menu_category_detail": (
                    None
                    if menu_category_detail is None
                    else str(menu_category_detail)
                ),
                "daily_heatmap": daily_heatmap,
                "weekly_heatmap": weekly_heatmap,
                "reporting_period": reporting_period,
            }
        )

    # Deterministic tie-break:
    # 1) higher total demand first
    # 2) alphabetical menu name when totals tie
    heatmap_results.sort(
        key=lambda menu_payload: (
            -sum(item["quantity"] for item in menu_payload["daily_heatmap"]),
            menu_payload["menu"],
        ),
    )

    return heatmap_results


def compute_menu_heatmaps_from_orders(
    order_rows: list[OrderRowForHeatmap],
) -> list[MenuHeatmapPayload]:
    """
    Compute menu heatmaps from order-level rows.

    Builds a DataFrame from the given rows and runs the heatmap calculation.
    Use this when you have raw order lines (e.g. from a DB) and want a single
    entry point for the heatmap result.

    Args:
        order_rows: List of order lines; see OrderRowForHeatmap for required
            (menu, qty, order_time) and optional (menu_category, menu_category_detail) keys.

    Returns:
        list[MenuHeatmapPayload] with daily_heatmap, weekly_heatmap per menu.
    """
    if not order_rows:
        return []

    df = pd.DataFrame(order_rows)
    return calculate_menu_heatmaps(df)
