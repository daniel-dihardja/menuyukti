import pandas as pd
from typing import List, Dict

WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def calculate_menu_heatmaps(df: pd.DataFrame) -> List[Dict]:
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

    heatmap_results = []

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

        daily_heatmap = [
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

        weekly_heatmap = [
            {"day": day, "quantity": int(weekly_qty.get(day, 0))}
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

    # Sort menus by total daily quantity (descending)
    heatmap_results.sort(
        key=lambda m: sum(item["quantity"] for item in m["daily_heatmap"]),
        reverse=True,
    )

    return heatmap_results
