from typing import Iterable, Literal, TypedDict, cast

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


def _rows_to_dataframe(rows: Iterable[object]) -> pd.DataFrame:
    """
    Build a DataFrame compatible with the menu heatmap calculation.

    Expects each row to expose the attributes:
      - menu
      - qty
      - order_time
      - menu_category
      - menu_category_detail
    """
    data = [
        {
            "menu": r.menu,
            "qty": r.qty,
            "order_time": r.order_time,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in rows
    ]
    return pd.DataFrame(data)


def calculate_menu_heatmaps_from_rows(
    rows: Iterable[object],
) -> list[MenuHeatmapPayload]:
    """
    Calculate daily (hourly) and weekly heatmaps per menu item from row objects.

    This ports the logic from menuyukti.core.analytics.calculate_menu_heatmaps
    so that the GraphQL app can compute heatmaps without importing that module.
    """
    df = _rows_to_dataframe(rows)

    if df.empty:
        return []

    df = df.copy()

    df["hour"] = df["order_time"].dt.hour
    df["weekday"] = df["order_time"].dt.day_name().str.lower().str[:3]
    reporting_period = df["order_time"].min().strftime("%Y-%m")

    heatmap_results: list[MenuHeatmapPayload] = []

    for menu_item, group in df.groupby("menu", sort=False):
        # Safely extract single category values.
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

        # Daily (hourly) heatmap.
        hourly_qty = group.groupby("hour")["qty"].sum()
        daily_heatmap: list[DailyHeatmapRow] = [
            {"hour": hour, "quantity": int(hourly_qty.get(hour, 0))}
            for hour in range(24)
        ]

        # Weekly heatmap (ordered).
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

    heatmap_results.sort(
        key=lambda menu_payload: (
            -sum(item["quantity"] for item in menu_payload["daily_heatmap"]),
            menu_payload["menu"],
        ),
    )

    return heatmap_results

