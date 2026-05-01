from __future__ import annotations

from datetime import datetime
from typing import TypedDict, cast

import pandas as pd

from menuyukti.core.analytics.calculate_menu_heatmaps import calculate_menu_heatmaps
from menuyukti.core.analytics.calculate_popularity_index import calculate_popularity_index
from menuyukti.core.analytics.frame_contracts import (
    require_columns,
)


class OrderRowForSalesAnalytics(TypedDict):
    """Line-item row for sales analytics (same columns as POSTransactionLineItem)."""

    bill_number: str
    menu: str
    qty: int
    price: float
    total_after_bill_discount: float
    order_time: datetime
    menu_category: str
    menu_category_detail: str


class AnalyticsCapabilities(TypedDict):
    has_order_id: bool
    has_datetime: bool
    enabled_blocks: list[str]


class FundamentalSignals(TypedDict):
    total_items_sold: int
    total_revenue: float
    unique_menu_items: int
    avg_item_price: float
    avg_popularity_threshold: float
    popularity_index: list[dict[str, object]]


class OrderSignals(TypedDict):
    total_orders: int
    avg_order_revenue: float
    max_order_revenue: float
    min_order_revenue: float
    avg_order_items: float
    max_order_items: int
    min_order_items: int


class DatetimeSignals(TypedDict):
    period_start: str | None
    period_end: str | None
    menu_heatmaps: list[dict[str, object]]


class AdditionalSignals(TypedDict):
    order_signals: OrderSignals | None
    datetime_signals: DatetimeSignals | None


class TieredSalesAnalyticsResult(TypedDict):
    capabilities: AnalyticsCapabilities
    fundamental_signals: FundamentalSignals
    additional_signals: AdditionalSignals


def _build_enabled_blocks(*, has_order_id: bool, has_datetime: bool) -> list[str]:
    blocks = ["fundamental_signals"]
    if has_order_id:
        blocks.append("order_signals")
    if has_datetime:
        blocks.append("datetime_signals")
    return blocks


def _derive_has_order_id(df: pd.DataFrame) -> bool:
    if "bill_number" not in df.columns:
        return False
    series = df["bill_number"].astype("string").str.strip()
    if series.eq("").all():
        return False
    return series.nunique(dropna=True) > 0


def _derive_has_datetime(df: pd.DataFrame) -> tuple[bool, pd.Series]:
    if "order_time" not in df.columns:
        return False, pd.Series([], dtype="datetime64[ns]")
    parsed = pd.to_datetime(df["order_time"], errors="coerce", format="mixed")
    has_valid = not parsed.isna().all()
    # QUINO fallback timestamp means the source did not provide real datetime granularity.
    if has_valid and parsed.nunique(dropna=True) == 1 and parsed.dropna().iloc[0] == pd.Timestamp(
        "1970-01-01 00:00:00"
    ):
        return False, parsed
    return has_valid, parsed


def calculate_sales_analytics(
    df: pd.DataFrame,
    *,
    has_order_id: bool | None = None,
    has_datetime: bool | None = None,
) -> TieredSalesAnalyticsResult:
    """
    Calculate capability-aware analytics with progressive signal tiers.
    """
    require_columns(df, ["menu", "qty", "price"], context="calculate_sales_analytics")
    if df.empty:
        raise ValueError("DataFrame is empty. Cannot calculate analytics.")

    df = df.copy()
    if "total_after_bill_discount" not in df.columns:
        df["total_after_bill_discount"] = pd.to_numeric(df["price"], errors="coerce") * pd.to_numeric(
            df["qty"], errors="coerce"
        )

    has_order = _derive_has_order_id(df) if has_order_id is None else has_order_id
    derived_has_datetime, parsed_order_time = _derive_has_datetime(df)
    has_dt = derived_has_datetime if has_datetime is None else has_datetime

    numeric_qty = pd.to_numeric(df["qty"], errors="coerce")
    numeric_price = pd.to_numeric(df["price"], errors="coerce")
    numeric_revenue = pd.to_numeric(df["total_after_bill_discount"], errors="coerce")

    total_items_sold = int(numeric_qty.fillna(0).sum())
    if total_items_sold == 0:
        raise ValueError("Total quantity is zero. Cannot calculate analytics.")
    total_revenue = float(numeric_revenue.fillna(0.0).sum())
    unique_menus = int(df["menu"].nunique())
    avg_item_price = float(
        numeric_price.where(numeric_price > 0).fillna(0.0).sum() / total_items_sold
        if total_items_sold > 0
        else 0.0
    )
    avg_popularity_threshold = 1 / unique_menus if unique_menus else 0

    popularity_index = cast(list[dict[str, object]], calculate_popularity_index(df))

    fundamental_signals = FundamentalSignals(
        total_items_sold=total_items_sold,
        total_revenue=total_revenue,
        unique_menu_items=unique_menus,
        avg_item_price=round(avg_item_price, 4),
        avg_popularity_threshold=float(avg_popularity_threshold),
        popularity_index=popularity_index,
    )

    order_signals: OrderSignals | None = None
    if has_order:
        order_totals = df.groupby("bill_number")["total_after_bill_discount"].sum()
        items_per_order = df.groupby("bill_number")["qty"].sum()
        valid_orders = order_totals[order_totals > 0].index
        if not valid_orders.empty:
            order_totals_valid = order_totals.loc[valid_orders]
            items_per_order_valid = items_per_order.loc[valid_orders]
            order_signals = OrderSignals(
                total_orders=int(order_totals.size),
                avg_order_revenue=float(order_totals_valid.mean()),
                max_order_revenue=float(order_totals_valid.max()),
                min_order_revenue=float(order_totals_valid.min()),
                avg_order_items=float(items_per_order_valid.mean()),
                max_order_items=int(items_per_order_valid.max()),
                min_order_items=int(items_per_order_valid.min()),
            )

    datetime_signals: DatetimeSignals | None = None
    if has_dt:
        df["order_time"] = parsed_order_time
        valid_dt = df["order_time"].dropna()
        if not valid_dt.empty:
            period_start = valid_dt.min().date().isoformat()
            period_end = valid_dt.max().date().isoformat()
            heatmap_results = cast(list[dict[str, object]], calculate_menu_heatmaps(df))
            datetime_signals = DatetimeSignals(
                period_start=period_start,
                period_end=period_end,
                menu_heatmaps=heatmap_results,
            )

    # Capability flags must match what we actually emit: callers may force ``has_datetime`` True
    # while every ``order_time`` is missing/invalid—then no datetime tier is produced.
    effective_has_datetime = datetime_signals is not None

    capabilities = AnalyticsCapabilities(
        has_order_id=has_order,
        has_datetime=effective_has_datetime,
        enabled_blocks=_build_enabled_blocks(
            has_order_id=has_order,
            has_datetime=effective_has_datetime,
        ),
    )

    return TieredSalesAnalyticsResult(
        capabilities=capabilities,
        fundamental_signals=fundamental_signals,
        additional_signals=AdditionalSignals(
            order_signals=order_signals,
            datetime_signals=datetime_signals,
        ),
    )


def compute_sales_analytics_from_orders(
    order_rows: list[OrderRowForSalesAnalytics],
    *,
    has_order_id: bool | None = None,
    has_datetime: bool | None = None,
) -> TieredSalesAnalyticsResult:
    """
    Run :func:`calculate_sales_analytics` on order-level rows.

    Builds a DataFrame with POSTransactionLineItem columns and delegates to
    :func:`calculate_sales_analytics`. Use when data comes from DB rows or APIs
    rather than an in-memory DataFrame.
    """
    if not order_rows:
        raise ValueError("order_rows must not be empty")

    df = pd.DataFrame(order_rows)
    return calculate_sales_analytics(
        df,
        has_order_id=has_order_id,
        has_datetime=has_datetime,
    )
