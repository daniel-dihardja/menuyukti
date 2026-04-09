"""GraphQL types and resolver for instagramSignals."""

from datetime import date

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.services.instagram_signals import build_instagram_signals


@strawberry.type(description="Menu engineering fields surfaced for Instagram hero/avoid copy.")
class MatrixBackedItemType:
    menu: str
    matrix_category: str
    total_revenue: float
    menu_category: str | None
    menu_category_detail: str | None


@strawberry.type(description="Venue-level demand timing for post scheduling.")
class BestPostingWindowType:
    peak_day: str | None
    peak_revenue_day: str | None
    primary_meal_period: str | None
    peak_revenue_meal_period: str | None
    peak_hour: int | None


@strawberry.type(description="Reporting period and revenue comparison for captions.")
class PeriodHeadlineType:
    period_start: str
    period_end: str
    total_revenue: float
    previous_period_total_revenue: float
    revenue_vs_previous_pct: float | None


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


@strawberry.type(
    description=(
        "Composite Instagram-oriented signals: heroes, trends, posting window, "
        "and period headline derived from sales analytics."
    )
)
class InstagramSignalsType:
    analytics_run_id: strawberry.ID
    period_start: date | None
    period_end: date | None
    content_heroes: list[MatrixBackedItemType]
    trending_items: list[TrendingItemType]
    avoid_items: list[MatrixBackedItemType]
    category_focus: CategoryFocusType | None
    best_posting_window: BestPostingWindowType
    period_headline: PeriodHeadlineType


def _matrix_item(raw: dict) -> MatrixBackedItemType:
    return MatrixBackedItemType(
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
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            raw = build_instagram_signals(session, run)
            if raw is None:
                return None

            cat = raw.get("category_focus")
            trending = raw.get("trending_items") or []

            return InstagramSignalsType(
                analytics_run_id=strawberry.ID(str(run.id)),
                period_start=run.period_start,
                period_end=run.period_end,
                content_heroes=[_matrix_item(x) for x in raw.get("content_heroes", [])],
                trending_items=[_trending_item(x) for x in trending],
                avoid_items=[_matrix_item(x) for x in raw.get("avoid_items", [])],
                category_focus=_category_focus(cat),
                best_posting_window=BestPostingWindowType(
                    peak_day=raw["best_posting_window"].get("peak_day"),
                    peak_revenue_day=raw["best_posting_window"].get("peak_revenue_day"),
                    primary_meal_period=raw["best_posting_window"].get("primary_meal_period"),
                    peak_revenue_meal_period=raw["best_posting_window"].get(
                        "peak_revenue_meal_period"
                    ),
                    peak_hour=raw["best_posting_window"].get("peak_hour"),
                ),
                period_headline=PeriodHeadlineType(
                    period_start=str(raw["period_headline"]["period_start"]),
                    period_end=str(raw["period_headline"]["period_end"]),
                    total_revenue=float(raw["period_headline"]["total_revenue"]),
                    previous_period_total_revenue=float(
                        raw["period_headline"]["previous_period_total_revenue"]
                    ),
                    revenue_vs_previous_pct=raw["period_headline"].get("revenue_vs_previous_pct"),
                ),
            )
        finally:
            session.close()
