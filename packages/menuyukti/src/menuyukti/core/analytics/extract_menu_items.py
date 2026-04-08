from typing import TypedDict

import pandas as pd

from menuyukti.core.analytics.frame_contracts import (
    ensure_optional_category_columns,
    extract_menu_items_required_columns,
    require_columns,
)


class ExtractedMenuItem(TypedDict):
    menu: str
    quantity: int
    total_revenue: float
    menu_category: str | None
    menu_category_detail: str | None


def extract_menu_items(df: pd.DataFrame) -> list[ExtractedMenuItem]:
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

    Optional columns ``menu_category`` and ``menu_category_detail`` default to
    ``None`` when missing.
    """
    require_columns(
        df,
        extract_menu_items_required_columns(),
        context="extract_menu_items",
    )
    if df.empty:
        return []

    df = ensure_optional_category_columns(df.copy())

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
            menu_category=("menu_category", "first"),
            menu_category_detail=("menu_category_detail", "first"),
        )
        .sort_values("quantity", ascending=False)
    )

    return menu_items.to_dict(orient="records")
