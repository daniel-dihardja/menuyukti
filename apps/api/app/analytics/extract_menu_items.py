import pandas as pd
from typing import List, Dict


def extract_menu_items(df: pd.DataFrame) -> List[Dict]:
    """
    Extract aggregated menu item facts for analytics.

    Returns per menu item:
    - menu
    - quantity (sum of qty)
    - total_revenue (sum of price * qty)

    Rows with price <= 0 or missing are skipped.

    Expects df to contain:
    - menu
    - qty
    - price
    """
    if df.empty:
        return []

    df = df.copy()

    # --------------------------------------------------
    # Filter invalid price rows
    # --------------------------------------------------
    df = df[df["price"].notna() & (df["price"] > 0)]

    if df.empty:
        return []

    # --------------------------------------------------
    # Calculate revenue per row
    # --------------------------------------------------
    df["revenue"] = df["price"] * df["qty"]

    # --------------------------------------------------
    # Aggregate per menu item
    # --------------------------------------------------
    menu_items = (
        df.groupby("menu", as_index=False)
        .agg(
            quantity=("qty", "sum"),
            total_revenue=("revenue", "sum"),
        )
        .sort_values("quantity", ascending=False)
    )

    return menu_items.to_dict(orient="records")
