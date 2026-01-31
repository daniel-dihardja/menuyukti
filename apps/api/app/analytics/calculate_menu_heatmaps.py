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
    """
    if df.empty:
        return []

    df = df.copy()

    df["hour"] = df["order_time"].dt.hour
    df["weekday"] = df["order_time"].dt.day_name().str.lower().str[:3]

    heatmap_results = []

    for menu_item, group in df.groupby("menu"):
        # -------- Daily (hourly) heatmap --------
        hourly_qty = group.groupby("hour")["qty"].sum()

        daily_heatmap = [
            {"hour": f"{hour:02d}", "quantity": int(hourly_qty.get(hour, 0))}
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
                "menuCategory": group["menu_category"],
                "menuCategoryDetail": group["menu_category_detail"],
                "dailyHeatmap": daily_heatmap,
                "weeklyHeatmap": weekly_heatmap,
            }
        )

    # Sort menus by total daily quantity (descending)
    heatmap_results.sort(
        key=lambda m: sum(item["quantity"] for item in m["dailyHeatmap"]),
        reverse=True,
    )

    return heatmap_results
