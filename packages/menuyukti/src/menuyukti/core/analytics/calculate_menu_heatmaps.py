from typing import Literal, TypedDict, cast

import pandas as pd

WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


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


def calculate_menu_heatmaps(df: pd.DataFrame) -> list[MenuHeatmapPayload]:
    """
    Calculate daily (hourly) and weekly heatmaps per menu item.

    Expects df to contain:
    - menu
    - qty
    - order_time (datetime)
    - menu_category
    - menu_category_detail
    """

    if df.empty:
        return []

    df = df.copy()

    df["hour"] = df["order_time"].dt.hour
    df["weekday"] = df["order_time"].dt.day_name().str.lower().str[:3]
    reporting_period = df["order_time"].min().strftime("%Y-%m")

    heatmap_results: list[MenuHeatmapPayload] = []

    for menu_item, group in df.groupby("menu", sort=False):

        # -------------------------------------------------
        # SAFELY EXTRACT SINGLE CATEGORY VALUES
        # -------------------------------------------------
        # We assume a menu item belongs to ONE category.
        # If multiple appear, the data pipeline is broken.
        menu_category_values = group["menu_category"].dropna().unique()
        menu_category_detail_values = group["menu_category_detail"].dropna().unique()

        if len(menu_category_values) > 1:
            raise ValueError(
                f"Menu '{menu_item}' has multiple categories: {menu_category_values}"
            )

        if len(menu_category_detail_values) > 1:
            raise ValueError(
                f"Menu '{menu_item}' has multiple category details: {menu_category_detail_values}"
            )

        menu_category = menu_category_values[0] if len(menu_category_values) else None
        menu_category_detail = (
            menu_category_detail_values[0] if len(menu_category_detail_values) else None
        )

        # -------- Daily (hourly) heatmap --------
        hourly_qty = group.groupby("hour")["qty"].sum()

        daily_heatmap: list[DailyHeatmapRow] = [
            {"hour": hour, "quantity": int(hourly_qty.get(hour, 0))}
            for hour in range(24)
        ]

        # -------- Weekly heatmap (ordered) --------
        weekly_qty = (
            group.assign(
                weekday=pd.Categorical(
                    group["weekday"],
                    categories=WEEKDAY_ORDER,
                    ordered=True,
                )
            )
            .groupby("weekday")["qty"]
            .sum()
        )

        weekly_heatmap: list[WeeklyHeatmapRow] = [
            {"day": cast(Weekday, day), "quantity": int(weekly_qty.get(day, 0))}
            for day in WEEKDAY_ORDER
        ]

        heatmap_results.append(
            {
                "menu": menu_item,
                "menu_category": menu_category,
                "menu_category_detail": menu_category_detail,
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
