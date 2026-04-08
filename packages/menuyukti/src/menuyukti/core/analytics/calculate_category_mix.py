"""Revenue and quantity mix per menu category for content planning."""

from __future__ import annotations

from typing import NotRequired, TypedDict

import pandas as pd

from menuyukti.core.analytics.frame_contracts import (
    category_mix_columns,
    ensure_optional_category_columns,
    require_columns,
)
from menuyukti.core.models.pos_transaction import POSTransactionLineItem

_COL = POSTransactionLineItem
_UNCAT = "(uncategorized)"


class OrderRowForCategoryMix(TypedDict):
    """Line-item row for category mix (category fields optional)."""

    bill_number: NotRequired[str]
    menu: str
    qty: int
    total_after_bill_discount: float
    menu_category: NotRequired[str | None]
    menu_category_detail: NotRequired[str | None]


class CategoryMixRow(TypedDict):
    """One category row with shares and the top-selling menu name in that category."""

    category: str
    total_revenue: float
    revenue_share: float
    total_qty: int
    qty_share: float
    top_item: str


class CategoryMixResult(TypedDict):
    """Category mix table and the single highest-revenue category for focus."""

    rows: list[CategoryMixRow]
    top_revenue_category: str | None


def calculate_category_mix(df: pd.DataFrame) -> CategoryMixResult:
    """
    Aggregate revenue and quantity share per ``menu_category``.

    Rows with null/empty ``menu_category`` are grouped under ``"(uncategorized)"``.
    """
    require_columns(
        df,
        category_mix_columns(),
        context="calculate_category_mix",
    )
    if df.empty:
        raise ValueError("DataFrame is empty. Cannot calculate category mix.")

    df = ensure_optional_category_columns(df.copy())
    cat = df[_COL.MENU_CATEGORY].fillna(_UNCAT).replace("", _UNCAT)
    work = df.assign(_menu_category=cat)

    mix = (
        work.groupby("_menu_category", observed=True)
        .agg(
            total_revenue=(_COL.TOTAL_AFTER_BILL_DISCOUNT, "sum"),
            total_qty=(_COL.QTY, "sum"),
        )
        .reset_index()
        .rename(columns={"_menu_category": "category"})
    )

    total_rev = float(mix["total_revenue"].sum())
    total_q = int(mix["total_qty"].sum())
    if total_rev <= 0 or total_q <= 0:
        raise ValueError(
            "Total revenue or quantity is zero. Cannot calculate category mix."
        )

    mix["revenue_share"] = mix["total_revenue"] / total_rev
    mix["qty_share"] = mix["total_qty"] / total_q

    # Top menu by revenue within each category (vectorized idxmax per group).
    menu_rev = (
        work.groupby(["_menu_category", _COL.MENU], observed=True)[
            _COL.TOTAL_AFTER_BILL_DISCOUNT
        ]
        .sum()
        .reset_index(name="menu_revenue")
    )
    top_idx = menu_rev.groupby("_menu_category", observed=True)["menu_revenue"].idxmax()
    top_by_cat = menu_rev.loc[top_idx].set_index("_menu_category")[_COL.MENU]

    mix["top_item"] = mix["category"].map(top_by_cat)

    mix = mix.sort_values(
        by=["total_revenue", "category"],
        ascending=[False, True],
        kind="mergesort",
    ).reset_index(drop=True)

    rows: list[CategoryMixRow] = [
        CategoryMixRow(
            category=str(r["category"]),
            total_revenue=round(float(r["total_revenue"]), 4),
            revenue_share=round(float(r["revenue_share"]), 6),
            total_qty=int(r["total_qty"]),
            qty_share=round(float(r["qty_share"]), 6),
            top_item=str(r["top_item"]),
        )
        for _, r in mix.iterrows()
    ]

    top_revenue_category = rows[0]["category"] if rows else None

    return CategoryMixResult(rows=rows, top_revenue_category=top_revenue_category)


def compute_category_mix_from_orders(
    order_rows: list[OrderRowForCategoryMix],
) -> CategoryMixResult:
    """Build a DataFrame from order lines and run :func:`calculate_category_mix`."""
    if not order_rows:
        raise ValueError("order_rows must not be empty")

    df = pd.DataFrame(order_rows)
    return calculate_category_mix(df)
