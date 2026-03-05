import pandas as pd

from menuyukti.core.analytics.calculate_menu_heatmaps import calculate_menu_heatmaps
from menuyukti.core.analytics.calculate_popularity_index import calculate_popularity_index


def calculate_sales_analytics(df: pd.DataFrame) -> dict[str, object]:
    """
    Calculate summary sales analytics, popularity index,
    and hourly/weekly heatmaps for each menu item.

    Orders with total_after_bill_discount <= 0 are excluded
    from order-level revenue and item metrics (bonuses, promos).
    """
    if df.empty:
        raise ValueError("DataFrame is empty. Cannot calculate analytics.")

    df = df.copy()

    # -------------------------------------------------------
    # Parse & validate order_time
    # -------------------------------------------------------
    df["order_time"] = pd.to_datetime(
        df["order_time"],
        errors="coerce",
        format="mixed",
    )
    if df["order_time"].isna().any():
        raise ValueError("Invalid order_time values after parsing")

    # -------------------------------------------------------
    # 1. Global Summary Metrics (raw data)
    # -------------------------------------------------------
    total_orders = df["bill_number"].nunique()
    total_items_sold = df.loc[df["price"] > 0, "qty"].sum()
    total_revenue = df["total_after_bill_discount"].sum()

    if total_items_sold == 0:
        raise ValueError("Total quantity is zero. Cannot calculate analytics.")

    # -------------------------------------------------------
    # 2. Order-level aggregates
    # -------------------------------------------------------
    order_totals = df.groupby("bill_number")["total_after_bill_discount"].sum()
    items_per_order = df.groupby("bill_number")["qty"].sum()

    # -------------------------------------------------------
    # 3. Exclude zero or negative revenue orders
    # -------------------------------------------------------
    valid_orders = order_totals[order_totals > 0].index

    if valid_orders.empty:
        raise ValueError("No positive-revenue orders found.")

    order_totals_valid = order_totals.loc[valid_orders]
    items_per_order_valid = items_per_order.loc[valid_orders]

    # -------------------------------------------------------
    # 4. Period range
    # -------------------------------------------------------
    period_start = df["order_time"].min().date()
    period_end = df["order_time"].max().date()

    # -------------------------------------------------------
    # 5. Avg Popularity Threshold
    # -------------------------------------------------------
    unique_menus = df["menu"].nunique()
    avg_popularity_threshold = 1 / unique_menus if unique_menus else 0

    # -------------------------------------------------------
    # 6. Popularity Index
    # -------------------------------------------------------
    popularity_index = calculate_popularity_index(df)

    # -------------------------------------------------------
    # 7. Heatmaps
    # -------------------------------------------------------
    heatmap_results = calculate_menu_heatmaps(df)

    # -------------------------------------------------------
    # Final Output
    # -------------------------------------------------------
    return {
        "metadata": {"source_system": "esb"},
        # Raw totals
        "total_orders": int(total_orders),
        "total_items_sold": int(total_items_sold),
        "total_revenue": float(total_revenue),
        # Order-level metrics (positive revenue orders only)
        "avg_order_revenue": float(order_totals_valid.mean()),
        "max_order_revenue": float(order_totals_valid.max()),
        "min_order_revenue": float(order_totals_valid.min()),
        "avg_order_items": float(items_per_order_valid.mean()),
        "max_order_items": int(items_per_order_valid.max()),
        "min_order_items": int(items_per_order_valid.min()),
        # Other analytics
        "avg_popularity": float(avg_popularity_threshold),
        "avg_popularity_threshold": float(avg_popularity_threshold),
        "popularity_index": popularity_index,
        "menu_heatmaps": heatmap_results,
        # Period
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
    }
