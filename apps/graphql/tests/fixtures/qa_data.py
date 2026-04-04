"""Minimal QA test data for heatmap and menu-engineering matrix tests.

No external Excel/JSON files. Data is tuned so that:
- Heatmap: 4 menus, orders in 2–3 hours and 2 weekdays (Mon, Fri).
- Menu engineering matrix: 4 items fall in star, plow_horse, puzzle, low_end
  with actions keep, keep/reprice, promote, remove.
"""

from datetime import datetime

from graphql.reports.ingest import NormalizedLineItemData

# Base datetime: Monday and Friday, hours 10, 14, 20 for heatmap variety.
_MON_10 = datetime(2024, 6, 3, 10, 0, 0)
_MON_14 = datetime(2024, 6, 3, 14, 0, 0)
_FRI_20 = datetime(2024, 6, 7, 20, 0, 0)

# Category labels (optional for matrix; first occurrence per menu is used for COGS).
_CAT = "Mains"
_CAT_DETAIL = "QA"

# 4 menus: aggregated qty/revenue/cogs are set so matrix yields one per quadrant.
# StarItem: high qty (5), high margin (75)
# PlowHorseItem: high qty (5), low margin (5)
# PuzzleItem: low qty (1), high margin (45)
# LowEndItem: low qty (1), very low margin (0.5) -> remove (contribution_margin_pct < 0.005)
QA_SALES_ROWS: list[NormalizedLineItemData] = [
    # Bill 1, Mon 10:00
    NormalizedLineItemData(
        billNumber="QA-B1",
        menu="StarItem",
        qty=3,
        price=20.0,
        totalAfterBillDiscount=60.0,
        orderTime=_MON_10,
        menuCategory=_CAT,
        menuCategoryDetail=_CAT_DETAIL,
    ),
    NormalizedLineItemData(
        billNumber="QA-B1",
        menu="PlowHorseItem",
        qty=2,
        price=6.0,
        totalAfterBillDiscount=12.0,
        orderTime=_MON_10,
        menuCategory=_CAT,
        menuCategoryDetail=_CAT_DETAIL,
    ),
    # Bill 2, Mon 14:00
    NormalizedLineItemData(
        billNumber="QA-B2",
        menu="StarItem",
        qty=2,
        price=20.0,
        totalAfterBillDiscount=40.0,
        orderTime=_MON_14,
        menuCategory=_CAT,
        menuCategoryDetail=_CAT_DETAIL,
    ),
    NormalizedLineItemData(
        billNumber="QA-B2",
        menu="PuzzleItem",
        qty=1,
        price=50.0,
        totalAfterBillDiscount=50.0,
        orderTime=_MON_14,
        menuCategory=_CAT,
        menuCategoryDetail=_CAT_DETAIL,
    ),
    # Bill 3, Fri 20:00
    NormalizedLineItemData(
        billNumber="QA-B3",
        menu="PlowHorseItem",
        qty=3,
        price=6.0,
        totalAfterBillDiscount=18.0,
        orderTime=_FRI_20,
        menuCategory=_CAT,
        menuCategoryDetail=_CAT_DETAIL,
    ),
    NormalizedLineItemData(
        billNumber="QA-B3",
        menu="LowEndItem",
        qty=1,
        price=5.5,
        totalAfterBillDiscount=5.5,
        orderTime=_FRI_20,
        menuCategory=_CAT,
        menuCategoryDetail=_CAT_DETAIL,
    ),
]

# Per-unit COGS so that matrix categories and actions are deterministic.
# StarItem/PlowHorseItem/PuzzleItem/LowEndItem all have cogs 5.0 (total_cogs = qty * 5).
QA_COGS_BY_MENU: dict[str, float] = {
    "StarItem": 5.0,
    "PlowHorseItem": 5.0,
    "PuzzleItem": 5.0,
    "LowEndItem": 5.0,
}


def qa_order_rows_for_matrix() -> list[dict]:
    """Order-level rows for compute_menu_engineering_from_orders (menu, qty, total_after_bill_discount, etc.)."""
    return [
        {
            "menu": r.menu,
            "qty": r.qty,
            "total_after_bill_discount": r.totalAfterBillDiscount,
            "menu_category": r.menuCategory,
            "menu_category_detail": r.menuCategoryDetail,
        }
        for r in QA_SALES_ROWS
    ]


def qa_order_rows_for_heatmap() -> list[dict]:
    """Order-level rows for compute_menu_heatmaps_from_orders (menu, qty, order_time, etc.)."""
    return [
        {
            "menu": r.menu,
            "qty": r.qty,
            "order_time": r.orderTime,
            "menu_category": r.menuCategory,
            "menu_category_detail": r.menuCategoryDetail,
        }
        for r in QA_SALES_ROWS
    ]
