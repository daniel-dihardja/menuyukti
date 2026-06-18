"""Strawberry types for instagramSignals."""

import strawberry


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


@strawberry.type
class CampaignBriefSignalCapabilitiesType:
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
class CampaignPlanningSignalsType:
    recommended_posting_days: list[str]
    recommended_dayparts: list[str]
    objective_recommendation: str
    primary_cta_channel: str


@strawberry.type
class SignalConfidenceType:
    tier: str
    coverage_notes: list[str]


@strawberry.type
class AdditionalSignalsType:
    order_signals: OrderSignalsType | None
    datetime_signals: DatetimeSignalsType | None
    matrix_signals: MatrixSignalsType
    campaign_planning_signals: CampaignPlanningSignalsType
    signal_confidence: SignalConfidenceType


@strawberry.type(description="Tiered analytics payload for campaign_brief and growth agents.")
class InstagramSignalsType:
    analytics_run_id: strawberry.ID
    capabilities: CampaignBriefSignalCapabilitiesType
    fundamental_signals: FundamentalSignalsType
    additional_signals: AdditionalSignalsType
