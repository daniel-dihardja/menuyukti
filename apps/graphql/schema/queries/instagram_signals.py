"""GraphQL types and resolver for capability-aware instagramSignals."""

from typing import Any

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.instagram_signals import build_instagram_signals


@strawberry.type(description="A menu item with rising revenue vs the prior period.")
class TrendingItemType:
    menu: str
    current_revenue: float
    previous_revenue: float
    change_pct: float | None
    rank_current: int
    rank_previous: int
    trend_label: str


@strawberry.type(description="Top revenue category from category mix.")
class CategoryFocusType:
    category: str | None
    revenue_share: float
    quantity_share: float


@strawberry.type
class MatrixSignalItemType:
    menu: str
    matrix_category: str
    total_revenue: float
    menu_category: str | None
    menu_category_detail: str | None


def _matrix_item(raw: dict) -> MatrixSignalItemType:
    return MatrixSignalItemType(
        menu=str(raw["menu"]),
        matrix_category=str(raw["matrix_category"]),
        total_revenue=float(raw["total_revenue"]),
        menu_category=raw.get("menu_category")
        if isinstance(raw.get("menu_category"), str)
        else None,
        menu_category_detail=(
            raw.get("menu_category_detail")
            if isinstance(raw.get("menu_category_detail"), str)
            else None
        ),
    )


def _trending_item(raw: dict) -> TrendingItemType:
    return TrendingItemType(
        menu=str(raw["menu"]),
        current_revenue=float(raw["current_revenue"]),
        previous_revenue=float(raw["previous_revenue"]),
        change_pct=float(raw["pct_change"]) if raw.get("pct_change") is not None else None,
        rank_current=int(raw["current_rank"]),
        rank_previous=int(raw["previous_rank"]),
        trend_label=str(raw["trend_label"]),
    )


def _category_focus(raw: dict | None) -> CategoryFocusType | None:
    if raw is None:
        return None
    # CategoryMixRow uses qty_share
    qty_key = "qty_share" if "qty_share" in raw else "quantity_share"
    return CategoryFocusType(
        category=str(raw["category"]) if raw.get("category") is not None else None,
        revenue_share=float(raw["revenue_share"]),
        quantity_share=float(raw[qty_key]),
    )


@strawberry.type
class BrandBriefSignalCapabilitiesType:
    has_order_id: bool
    has_datetime: bool
    enabled_blocks: list[str]


@strawberry.type
class FundamentalSalesSignalsType:
    total_items_sold: int
    total_revenue: float
    unique_menu_items: int
    avg_item_price: float
    avg_popularity_threshold: float


@strawberry.type
class FundamentalSignalsType:
    sales: FundamentalSalesSignalsType
    category_focus: CategoryFocusType | None
    trending_items: list[TrendingItemType]


@strawberry.type
class OrderSignalsType:
    total_orders: int
    avg_order_revenue: float
    max_order_revenue: float
    min_order_revenue: float
    avg_order_items: float
    max_order_items: int
    min_order_items: int


@strawberry.type
class BestPostingWindowType:
    peak_day: str | None
    peak_revenue_day: str | None
    primary_meal_period: str | None
    peak_revenue_meal_period: str | None
    peak_hour: int | None


@strawberry.type
class PeriodHeadlineType:
    period_start: str
    period_end: str
    total_revenue: float
    previous_period_total_revenue: float
    revenue_vs_previous_pct: float | None


@strawberry.type
class DatetimeSignalsType:
    best_posting_window: BestPostingWindowType
    period_headline: PeriodHeadlineType


@strawberry.type
class MatrixSignalsType:
    content_heroes: list[MatrixSignalItemType]
    avoid_items: list[MatrixSignalItemType]


@strawberry.type
class AdditionalSignalsType:
    order_signals: OrderSignalsType | None
    datetime_signals: DatetimeSignalsType | None
    matrix_signals: MatrixSignalsType


@strawberry.type(description="Tiered analytics payload for brand brief and growth agents.")
class InstagramSignalsType:
    analytics_run_id: strawberry.ID
    capabilities: BrandBriefSignalCapabilitiesType
    fundamental_signals: FundamentalSignalsType
    additional_signals: AdditionalSignalsType


@strawberry.type
class InstagramSignalsQuery:
    @strawberry.field(
        description=(
            "Composite Instagram signals for an analytics run: content heroes, "
            "trending items, avoid list, category focus, best posting window, "
            "and period headline. Requires order facts; returns null if none."
        )
    )
    def instagram_signals(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
    ) -> InstagramSignalsType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            raw = build_instagram_signals(session, run)
            if raw is None:
                return None

            caps = raw.get("capabilities") or {}
            fundamental = raw.get("fundamental_signals") or {}
            sales_raw = fundamental.get("sales") if isinstance(fundamental, dict) else None
            sales: dict[str, Any] = sales_raw if isinstance(sales_raw, dict) else {}
            trending = (
                fundamental.get("trending_items", [])
                if isinstance(fundamental, dict)
                else []
            )
            additional = raw.get("additional_signals") or {}
            order_signals = additional.get("order_signals") if isinstance(additional, dict) else None
            dt_signals = additional.get("datetime_signals") if isinstance(additional, dict) else None
            matrix = additional.get("matrix_signals") if isinstance(additional, dict) else {}
            cat = (
                fundamental.get("category_focus")
                if isinstance(fundamental, dict)
                else None
            )

            return InstagramSignalsType(
                analytics_run_id=strawberry.ID(str(run.id)),
                capabilities=BrandBriefSignalCapabilitiesType(
                    has_order_id=bool(caps.get("has_order_id")),
                    has_datetime=bool(caps.get("has_datetime")),
                    enabled_blocks=[str(x) for x in caps.get("enabled_blocks", [])],
                ),
                fundamental_signals=FundamentalSignalsType(
                    sales=FundamentalSalesSignalsType(
                        total_items_sold=int(sales.get("total_items_sold") or 0),
                        total_revenue=float(sales.get("total_revenue") or 0.0),
                        unique_menu_items=int(sales.get("unique_menu_items") or 0),
                        avg_item_price=float(sales.get("avg_item_price") or 0.0),
                        avg_popularity_threshold=float(sales.get("avg_popularity_threshold") or 0.0),
                    ),
                    category_focus=_category_focus(cat),
                    trending_items=[_trending_item(x) for x in trending],
                ),
                additional_signals=AdditionalSignalsType(
                    order_signals=(
                        OrderSignalsType(
                            total_orders=int(order_signals.get("total_orders") or 0),
                            avg_order_revenue=float(order_signals.get("avg_order_revenue") or 0.0),
                            max_order_revenue=float(order_signals.get("max_order_revenue") or 0.0),
                            min_order_revenue=float(order_signals.get("min_order_revenue") or 0.0),
                            avg_order_items=float(order_signals.get("avg_order_items") or 0.0),
                            max_order_items=int(order_signals.get("max_order_items") or 0),
                            min_order_items=int(order_signals.get("min_order_items") or 0),
                        )
                        if isinstance(order_signals, dict)
                        else None
                    ),
                    datetime_signals=(
                        DatetimeSignalsType(
                            best_posting_window=BestPostingWindowType(
                                peak_day=dt_signals.get("best_posting_window", {}).get("peak_day"),
                                peak_revenue_day=dt_signals.get("best_posting_window", {}).get(
                                    "peak_revenue_day"
                                ),
                                primary_meal_period=dt_signals.get("best_posting_window", {}).get(
                                    "primary_meal_period"
                                ),
                                peak_revenue_meal_period=dt_signals.get(
                                    "best_posting_window", {}
                                ).get("peak_revenue_meal_period"),
                                peak_hour=dt_signals.get("best_posting_window", {}).get("peak_hour"),
                            ),
                            period_headline=PeriodHeadlineType(
                                period_start=str(
                                    dt_signals.get("period_headline", {}).get("period_start") or ""
                                ),
                                period_end=str(
                                    dt_signals.get("period_headline", {}).get("period_end") or ""
                                ),
                                total_revenue=float(
                                    dt_signals.get("period_headline", {}).get("total_revenue")
                                    or 0.0
                                ),
                                previous_period_total_revenue=float(
                                    dt_signals.get("period_headline", {}).get(
                                        "previous_period_total_revenue"
                                    )
                                    or 0.0
                                ),
                                revenue_vs_previous_pct=dt_signals.get("period_headline", {}).get(
                                    "revenue_vs_previous_pct"
                                ),
                            ),
                        )
                        if isinstance(dt_signals, dict)
                        else None
                    ),
                    matrix_signals=MatrixSignalsType(
                        content_heroes=[
                            _matrix_item(x)
                            for x in (matrix.get("content_heroes", []) if isinstance(matrix, dict) else [])
                        ],
                        avoid_items=[
                            _matrix_item(x)
                            for x in (matrix.get("avoid_items", []) if isinstance(matrix, dict) else [])
                        ],
                    ),
                ),
            )
