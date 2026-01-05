import pandas as pd

from .calculate_menu_heatmaps import calculate_menu_heatmaps
from .calculate_popularity_index import calculate_popularity_index


def calculate_sales_analytics(df: pd.DataFrame) -> dict:
    """
    Calculate summary sales analytics, popularity index,
    and hourly/weekly heatmaps for each menu item.
    """
    if df.empty:
        raise ValueError("DataFrame is empty. Cannot calculate analytics.")

    df = df.copy()

    df["order_time"] = pd.to_datetime(df["order_time"], errors="coerce")
    if df["order_time"].isna().any():
        raise ValueError("Invalid order_time values after parsing")

    # -------------------------------------------------------
    # 1. Summary Metrics
    # -------------------------------------------------------
    total_orders = df["bill_number"].nunique()
    total_items_sold = df["qty"].sum()
    total_revenue = df["total_after_bill_discount"].sum()

    if total_items_sold == 0:
        raise ValueError("Total quantity is zero. Cannot calculate analytics.")

    order_totals = df.groupby("bill_number")["total_after_bill_discount"].sum()
    items_per_order = df.groupby("bill_number")["qty"].sum()

    period_start = df["order_time"].min().date()
    period_end = df["order_time"].max().date()

    # -------------------------------------------------------
    # 2. Avg Popularity Threshold
    # -------------------------------------------------------
    unique_menus = df["menu"].nunique()
    avg_popularity_threshold = 1 / unique_menus if unique_menus else 0

    # -------------------------------------------------------
    # 3. Popularity Index (extracted)
    # -------------------------------------------------------
    popularity_index = calculate_popularity_index(df)

    # -------------------------------------------------------
    # 4. Heatmaps (extracted)
    # -------------------------------------------------------
    heatmap_results = calculate_menu_heatmaps(df)

    # -------------------------------------------------------
    # Final Output
    # -------------------------------------------------------
    return {
        "total_orders": int(total_orders),
        "total_items_sold": int(total_items_sold),
        "total_revenue": float(total_revenue),
        "avg_order_revenue": float(order_totals.mean()),
        "max_order_revenue": float(order_totals.max()),
        "min_order_revenue": float(order_totals.min()),
        "avg_order_items": float(items_per_order.mean()),
        "max_order_items": int(items_per_order.max()),
        "min_order_items": int(items_per_order.min()),
        "avg_popularity": float(avg_popularity_threshold),
        "popularity_index": popularity_index,
        "menu_heatmaps": heatmap_results,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
    }
