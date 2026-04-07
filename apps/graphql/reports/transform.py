"""Transform normalized line items to orders and run menuyukti analytics."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime

import pandas as pd
from menuyukti.core.analytics import calculate_sales_analytics

from graphql.reports.ingest import NormalizedLineItemData


@dataclass
class OrderItem:
    """Single line item within an order (menu item with qty and revenue)."""

    menu: str
    qty: int
    price: float
    totalAfterBillDiscount: float
    menuCategory: str
    menuCategoryDetail: str


@dataclass
class Order:
    """Order grouped by bill_number with its line items."""

    billNumber: str
    orderTime: datetime
    items: list[OrderItem]


def line_items_to_orders(
    rows: list[NormalizedLineItemData],
) -> list[Order]:
    """
    Group normalized line items by bill_number into orders with items.

    Orders are sorted by (billNumber, orderTime); items within each order
    are sorted by menu name for stable output.
    """
    if not rows:
        return []

    grouped: dict[tuple[str, datetime], list[NormalizedLineItemData]] = defaultdict(list)
    for row in rows:
        order_time = row.orderTime
        if not isinstance(order_time, datetime):
            order_time = datetime.fromisoformat(str(order_time))
        key = (row.billNumber, order_time)
        grouped[key].append(row)

    result: list[Order] = []
    for (bill_number, order_time), group in sorted(grouped.items()):
        items = [
            OrderItem(
                menu=row.menu,
                qty=row.qty,
                price=row.price,
                totalAfterBillDiscount=row.totalAfterBillDiscount,
                menuCategory=row.menuCategory,
                menuCategoryDetail=row.menuCategoryDetail,
            )
            for row in sorted(group, key=lambda r: (r.menu, r.menuCategory))
        ]
        result.append(Order(billNumber=bill_number, orderTime=order_time, items=items))

    return result


def line_items_to_dataframe(
    rows: list[NormalizedLineItemData],
) -> pd.DataFrame:
    """Build a DataFrame with POSTransactionLineItem columns for menuyukti."""
    if not rows:
        return pd.DataFrame(
            columns=[
                "bill_number",
                "menu",
                "qty",
                "price",
                "total_after_bill_discount",
                "order_time",
                "menu_category",
                "menu_category_detail",
            ]
        )

    data = [
        {
            "bill_number": r.billNumber,
            "menu": r.menu,
            "qty": r.qty,
            "price": r.price,
            "total_after_bill_discount": r.totalAfterBillDiscount,
            "order_time": r.orderTime,
            "menu_category": r.menuCategory,
            "menu_category_detail": r.menuCategoryDetail,
        }
        for r in rows
    ]
    return pd.DataFrame(data)


def run_sales_analytics(
    rows: list[NormalizedLineItemData],
) -> dict[str, object]:
    """
    Run menuyukti sales analytics (heatmaps, avg order size, revenue, etc.).

    Returns the full dict from calculate_sales_analytics (metadata, totals,
    order-level metrics, popularity_index, menu_heatmaps, period).
    """
    df = line_items_to_dataframe(rows)
    if df.empty:
        return {
            "metadata": {"source_system": "esb"},
            "total_orders": 0,
            "total_items_sold": 0,
            "total_revenue": 0.0,
            "popularity_index": [],
            "menu_heatmaps": [],
            "period_start": "",
            "period_end": "",
        }
    return calculate_sales_analytics(df)
