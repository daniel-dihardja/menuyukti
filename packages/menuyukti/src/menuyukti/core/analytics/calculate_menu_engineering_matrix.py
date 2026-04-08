from __future__ import annotations

from typing import NotRequired, TypedDict

import pandas as pd


# ---------------------------------------------------------------------------
# Input: order-level rows for matrix aggregation
# ---------------------------------------------------------------------------


class OrderRowForMatrix(TypedDict):
    """One order line. Required keys for aggregation; category fields optional."""

    menu: str
    qty: int | float
    total_after_bill_discount: float
    menu_category: NotRequired[str | None]
    menu_category_detail: NotRequired[str | None]


# ---------------------------------------------------------------------------
# Output: matrix result structure (JSON-friendly dicts)
# ---------------------------------------------------------------------------


class MenuEngineeringThresholds(TypedDict):
    avg_popularity: float
    avg_contribution_margin: float
    total_cogs: float
    total_profit: float
    total_margin: float


class MenuEngineeringDistributionItem(TypedDict):
    category: str
    item_count: int
    item_share: float
    margin_share: float


class MenuEngineeringMatrixItem(TypedDict):
    menu: str
    quantity: int
    total_revenue: float
    cogs: float
    total_cogs: float
    contribution_margin: float
    contribution_margin_percentage: float
    margin_per_unit: float
    we_value: float
    category: str
    action: str
    menu_category: NotRequired[str | None]
    menu_category_detail: NotRequired[str | None]


class MenuEngineeringMatrixResult(TypedDict):
    thresholds: MenuEngineeringThresholds
    distribution: list[MenuEngineeringDistributionItem]
    items: list[MenuEngineeringMatrixItem]


# ---------------------------------------------------------------------------
# Action classification (extracted for clarity and unit testing)
# ---------------------------------------------------------------------------


def _classify_action(
    category: str,
    contribution_margin_percentage: float,
    margin_per_unit: float,
    quantity: float,
    avg_margin: float,
    avg_popularity: float,
) -> str:
    """
    Map matrix quadrant and margins to a recommended action per menu item.

    Mirrors the previous vectorized mask logic: remove/reprice take precedence
    over promote for overlapping conditions.
    """
    remove = (
        category == "low_end"
        and contribution_margin_percentage < 0.005
        and quantity < avg_popularity
    )
    reprice = category == "low_end" and margin_per_unit >= avg_margin and not remove
    promote = category == "puzzle" and not remove and not reprice
    if promote:
        return "promote"
    if reprice:
        return "reprice"
    if remove:
        return "remove"
    return "keep"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compute_menu_engineering_from_orders(
    order_rows: list[OrderRowForMatrix],
    cogs_by_menu: dict[str, float],
) -> MenuEngineeringMatrixResult:
    """
    Compute Menu Engineering Matrix from order-level rows and a COGS map.

    Aggregates orders to menu level, attaches COGS, then runs the matrix
    calculation. Use this when you have raw order lines and per-menu COGS
    (e.g. from a DB) and want a single entry point for the matrix result.

    Args:
        order_rows: List of order lines; see OrderRowForMatrix for required
            (menu, qty, total_after_bill_discount) and optional keys.
        cogs_by_menu: Map menu name -> COGS per unit (float). Menus not in
            the map get COGS 0.0.

    Returns:
        MenuEngineeringMatrixResult with thresholds, distribution, items.
    """
    if not order_rows:
        raise ValueError("order_rows must not be empty")

    df = pd.DataFrame(order_rows)
    agg_kw: dict[str, tuple] = {
        "quantity": ("qty", "sum"),
        "total_revenue": ("total_after_bill_discount", "sum"),
    }
    if "menu_category" in df.columns:
        agg_kw["menu_category"] = ("menu_category", "first")
    if "menu_category_detail" in df.columns:
        agg_kw["menu_category_detail"] = ("menu_category_detail", "first")

    menu_level = df.groupby("menu", as_index=False).agg(**agg_kw)
    if "menu_category" not in menu_level.columns:
        menu_level["menu_category"] = None
    if "menu_category_detail" not in menu_level.columns:
        menu_level["menu_category_detail"] = None

    menu_level["cogs"] = menu_level["menu"].map(cogs_by_menu).fillna(0.0)
    return calculate_menu_engineering_matrix(menu_level)


def calculate_menu_engineering_matrix(df: pd.DataFrame) -> MenuEngineeringMatrixResult:
    """
    Calculate Menu Engineering Matrix from menu items.

    Required columns:
    - menu (str)
    - quantity (int)
    - total_revenue (float)
    - cogs (float | NaN) — default 0 if missing

    Optional columns (if present, included in each output item; otherwise None):
    - menu_category (str)
    - menu_category_detail (str)

    Items with cogs == 0 are skipped for matrix logic.
    All percentage values are returned in the range [0, 1].
    """

    # --------------------------------------------------
    # Validation
    # --------------------------------------------------
    required_cols = {"menu", "quantity", "total_revenue"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = df.copy()

    # --------------------------------------------------
    # Normalize types
    # --------------------------------------------------
    df["quantity"] = df["quantity"].astype(float)
    df["total_revenue"] = df["total_revenue"].astype(float)
    df["cogs"] = df.get("cogs", 0).astype(float)

    # --------------------------------------------------
    # Derived values (for TOTAL KPIs — before filtering)
    # --------------------------------------------------
    df["total_cogs"] = df["cogs"] * df["quantity"]
    df["contribution_margin"] = df["total_revenue"] - df["total_cogs"]

    total_revenue_all = df["total_revenue"].sum()
    total_cogs_all = df["total_cogs"].sum()
    total_profit_all = total_revenue_all - total_cogs_all

    total_margin_ratio = (
        total_profit_all / total_revenue_all if total_revenue_all > 0 else 0.0
    )

    # --------------------------------------------------
    # Filter only for matrix logic
    # --------------------------------------------------
    df = df[(df["cogs"] > 0) & (df["total_revenue"] > 0)]

    if df.empty:
        raise ValueError("No valid menu items with cogs > 0 and revenue > 0")

    # --------------------------------------------------
    # Matrix-specific derived values
    # --------------------------------------------------
    df["we_value"] = df["total_cogs"] / df["total_revenue"]

    total_margin_matrix = df["contribution_margin"].sum()

    df["contribution_margin_percentage"] = (
        df["contribution_margin"] / total_margin_matrix
        if total_margin_matrix > 0
        else 0.0
    )

    df["margin_per_unit"] = (
        df["contribution_margin"].where(df["quantity"] > 0, 0.0)
        / df["quantity"].where(df["quantity"] > 0, 1.0)
    )

    # --------------------------------------------------
    # Thresholds
    # --------------------------------------------------
    avg_popularity = df["quantity"].mean()
    avg_margin = df["contribution_margin"].mean()

    # --------------------------------------------------
    # Classification (Menu Engineering Matrix)
    # --------------------------------------------------
    popular = df["quantity"] >= avg_popularity
    profitable = df["contribution_margin"] >= avg_margin
    df["category"] = "low_end"
    df.loc[popular & profitable, "category"] = "star"
    df.loc[popular & ~profitable, "category"] = "plow_horse"
    df.loc[~popular & profitable, "category"] = "puzzle"

    # --------------------------------------------------
    # Action recommendation
    # --------------------------------------------------
    df["action"] = df.apply(
        lambda r: _classify_action(
            str(r["category"]),
            float(r["contribution_margin_percentage"]),
            float(r["margin_per_unit"]),
            float(r["quantity"]),
            float(avg_margin),
            float(avg_popularity),
        ),
        axis=1,
    )

    # --------------------------------------------------
    # Distribution (category-level aggregation)
    # --------------------------------------------------
    total_items = len(df)
    distribution: list[MenuEngineeringDistributionItem] = []

    for category, group in df.groupby("category"):
        count = len(group)
        category_margin = group["contribution_margin"].sum()

        distribution.append(
            {
                "category": category,
                "item_count": int(count),
                "item_share": count / total_items if total_items > 0 else 0.0,
                "margin_share": (
                    category_margin / total_margin_matrix
                    if total_margin_matrix > 0
                    else 0.0
                ),
            }
        )

    # Deterministic tie-break for distribution:
    # 1) higher margin_share
    # 2) higher item_share
    # 3) alphabetical category
    distribution.sort(
        key=lambda item: (
            -item["margin_share"],
            -item["item_share"],
            item["category"],
        ),
    )

    # --------------------------------------------------
    # Output (JSON-friendly)
    # --------------------------------------------------
    return {
        "thresholds": {
            "avg_popularity": round(avg_popularity, 2),
            "avg_contribution_margin": round(avg_margin, 2),
            # Snapshot-level KPIs (aligned with Prisma Analytics)
            "total_cogs": round(total_cogs_all, 2),  # Σ(cogs × quantity)
            "total_profit": round(
                total_profit_all, 2
            ),  # NEW — totalRevenue − totalCogs
            "total_margin": round(total_margin_ratio, 4),  # (revenue − cogs) / revenue
        },
        "distribution": distribution,
        "items": [
            {
                "menu": row["menu"],
                "quantity": int(row["quantity"]),
                "total_revenue": round(row["total_revenue"], 2),
                "cogs": round(row["cogs"], 2),
                "total_cogs": round(row["total_cogs"], 2),
                "contribution_margin": round(row["contribution_margin"], 2),
                "contribution_margin_percentage": round(
                    row["contribution_margin_percentage"], 4
                ),
                "margin_per_unit": round(row["margin_per_unit"], 2),
                "we_value": round(row["we_value"], 4),
                "category": row["category"],
                "action": row["action"],
                "menu_category": row.get("menu_category"),
                "menu_category_detail": row.get("menu_category_detail"),
            }
            for _, row in df.sort_values(
                by=["quantity", "total_revenue", "menu"],
                ascending=[False, False, True],
                kind="mergesort",
            ).iterrows()
        ],
    }
