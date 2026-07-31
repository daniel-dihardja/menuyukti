"""Analytics entry points for the menuyukti package.

**Pandas pipelines** (``calculate_<name>(df)`` / ``compute_<name>_from_orders``):

1. Colocate a ``TypedDict`` for line-level input rows with the module (see
   ``OrderRowForHeatmap``, ``OrderRowForMatrix``, ``OrderRowForCategoryMix``, etc.).
2. Implement ``calculate_<name>(df: pd.DataFrame)`` and call
   ``require_columns`` (from ``frame_contracts``) with the matching
   ``*_columns()`` helper (e.g. ``category_mix_columns``,
   ``revenue_trends_columns``, ``heatmap_columns``, ``line_item_columns_full``)
   so missing columns fail with ``ValueError`` instead of ``KeyError``.
3. Expose ``compute_<name>_from_orders(rows: list[...])`` that builds
   ``pd.DataFrame(rows)`` and delegates to ``calculate_<name>``.
4. Prefer vectorized groupby/merge/resample; avoid row loops for aggregations.

**Composition-only** (no ``DataFrame`` in the public API):

- ``calculate_instagram_signals`` takes *already computed* results (category
  mix, revenue trends, sales analytics dict, optional operating profile and menu
  engineering). Callers run the pandas pipelines first, then compose for LLM/agent
  prompts.

**Instagram-oriented exports** (agent copy guardrails):

- ``calculate_category_mix`` / ``compute_category_mix_from_orders``
- ``calculate_revenue_trends`` / ``compute_revenue_trends_from_orders``
- ``calculate_instagram_signals``

Callers outside this package should prefer typed row lists and
``compute_*_from_orders`` over constructing ``DataFrame`` objects ad hoc.

**Empty-input policy** (``compute_*_from_orders`` / empty frames):

| Behavior | Pipelines |
|----------|-----------|
| Raise ``ValueError`` | sales analytics, category mix, popularity, revenue trends (empty current), menu engineering |
| Return empty structure (``[]`` / empty TypedDict lists) | heatmaps, weekly demand, slot demand, basket affinities, combo pair timing |
| Return ``None`` | operating profile / order metrics by day when no positive-revenue bills |

GraphQL services typically guard with ``if not facts: return None`` before calling
into the package.
"""

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    MenuEngineeringDistributionItem,
    MenuEngineeringMatrixItem,
    MenuEngineeringMatrixResult,
    MenuEngineeringThresholds,
    OrderRowForMatrix,
    calculate_menu_engineering_matrix,
    compute_menu_engineering_from_orders,
)
from menuyukti.core.analytics.calculate_category_mix import (
    CategoryMixResult,
    CategoryMixRow,
    OrderRowForCategoryMix,
    calculate_category_mix,
    compute_category_mix_from_orders,
)
from menuyukti.core.analytics.calculate_instagram_signals import (
    BestPostingWindow,
    InstagramSignalsResult,
    MatrixBackedItem,
    PeriodHeadline,
    calculate_instagram_signals,
)
from menuyukti.core.analytics.calculate_menu_basket_affinities import (
    MenuBasketAffinitiesResult,
    MenuBasketPair,
    OrderRowForBasket,
    calculate_menu_basket_affinities,
    compute_menu_basket_affinities_from_orders,
)
from menuyukti.core.analytics.calculate_combo_pair_timing import (
    ComboPairInput,
    ComboPairRecommendedWindow,
    ComboPairTimingCell,
    ComboPairTimingHour,
    ComboPairTimingResult,
    OrderRowForComboTiming,
    compute_combo_pair_timing_from_orders,
)
from menuyukti.core.analytics.calculate_slot_menu_candidates import (
    OrderRowForSlotMenuCandidates,
    SlotMenuCandidateItem,
    SlotMenuCandidatesCell,
    SlotMenuCandidatesOptions,
    SlotMenuCandidatesResult,
    compute_slot_menu_candidates,
)
from menuyukti.core.analytics.calculate_slot_demand_profile import (
    OrderRowForSlotDemand,
    PromoPostureResult,
    SlotDemandCell,
    VenueSlotPerformanceCell,
    VenueSlotPerformanceSummary,
    calculate_slot_demand_profile,
    compute_slot_demand_profile_from_orders,
    derive_combo_promo_posture,
    summarize_venue_slot_performance,
)
from menuyukti.core.analytics.calculate_menu_heatmaps import (
    WEEKDAY_ORDER,
    DailyHeatmapRow,
    MenuHeatmapPayload,
    OrderRowForHeatmap,
    WeeklyHeatmapRow,
    calculate_menu_heatmaps,
    compute_menu_heatmaps_from_orders,
)
from menuyukti.core.analytics.calculate_operating_profile import (
    DayOfWeekRow,
    DayTypeRow,
    MealPeriodRow,
    OperatingProfileResult,
    OrderMetricsByDayRow,
    OrderRowForProfile,
    compute_operating_profile_from_orders,
    compute_order_metrics_by_day_from_orders,
)
from menuyukti.core.analytics.calculate_popularity_index import (
    calculate_popularity_index,
)
from menuyukti.core.analytics.calculate_menu_engineering_promotion_candidates import (
    compute_menu_engineering_promotion_candidates,
)
from menuyukti.core.analytics.calculate_promotion_candidates import (
    BestPostingWindowInput,
    InstagramSignalMenuItem,
    PromotionCandidatesResult,
    PromotionMenuItemForCandidates,
    PromotionRankedCandidate,
    PuzzleOpportunityPool,
    PuzzleSelectedCandidate,
    calculate_promotion_candidates,
)
from menuyukti.core.analytics.calculate_revenue_trends import (
    OrderRowForRevenueTrends,
    RevenueTrendRow,
    RevenueTrendsResult,
    calculate_revenue_trends,
    compute_revenue_trends_from_orders,
)
from menuyukti.core.analytics.calculate_sales_analytics import (
    AdditionalSignals,
    AnalyticsCapabilities,
    DatetimeSignals,
    FundamentalSignals,
    OrderRowForSalesAnalytics,
    OrderSignals,
    TieredSalesAnalyticsResult,
    calculate_sales_analytics,
    compute_sales_analytics_from_orders,
)
from menuyukti.core.analytics.calculate_weekly_demand_pattern import (
    OrderRowForWeeklyDemand,
    WeeklyDemandPatternRow,
    calculate_weekly_demand_pattern,
    compute_weekly_demand_pattern_from_orders,
)
from menuyukti.core.analytics.extract_menu_items import extract_menu_items
from menuyukti.core.analytics.frame_contracts import (
    category_mix_columns,
    ensure_optional_category_columns,
    extract_menu_items_required_columns,
    heatmap_columns,
    line_item_columns_full,
    menu_basket_affinities_columns,
    menu_engineering_columns,
    popularity_index_columns,
    require_columns,
    revenue_trends_columns,
    slot_demand_columns,
    weekly_demand_columns,
)
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from menuyukti.core.analytics.registry import NORMALIZERS, get_normalizer

__all__ = [
    "BestPostingWindow",
    "CategoryMixResult",
    "CategoryMixRow",
    "DailyHeatmapRow",
    "DayOfWeekRow",
    "DayTypeRow",
    "InstagramSignalsResult",
    "MatrixBackedItem",
    "MealPeriodRow",
    "MenuEngineeringDistributionItem",
    "MenuEngineeringMatrixItem",
    "MenuEngineeringMatrixResult",
    "MenuEngineeringThresholds",
    "MenuHeatmapPayload",
    "MenuBasketAffinitiesResult",
    "MenuBasketPair",
    "OrderRowForBasket",
    "OperatingProfileResult",
    "OrderMetricsByDayRow",
    "OrderSignals",
    "OrderRowForCategoryMix",
    "OrderRowForMatrix",
    "OrderRowForHeatmap",
    "OrderRowForProfile",
    "OrderRowForRevenueTrends",
    "OrderRowForSalesAnalytics",
    "PeriodHeadline",
    "TieredSalesAnalyticsResult",
    "RevenueTrendRow",
    "RevenueTrendsResult",
    "WeeklyHeatmapRow",
    "WEEKDAY_ORDER",
    "WeeklyDemandPatternRow",
    "OrderRowForWeeklyDemand",
    "calculate_category_mix",
    "calculate_instagram_signals",
    "calculate_revenue_trends",
    "calculate_sales_analytics",
    "calculate_weekly_demand_pattern",
    "compute_weekly_demand_pattern_from_orders",
    "compute_category_mix_from_orders",
    "compute_sales_analytics_from_orders",
    "calculate_menu_heatmaps",
    "compute_menu_heatmaps_from_orders",
    "calculate_menu_basket_affinities",
    "compute_menu_basket_affinities_from_orders",
    "ComboPairInput",
    "ComboPairRecommendedWindow",
    "ComboPairTimingCell",
    "ComboPairTimingHour",
    "ComboPairTimingResult",
    "OrderRowForComboTiming",
    "compute_combo_pair_timing_from_orders",
    "OrderRowForSlotDemand",
    "OrderRowForSlotMenuCandidates",
    "PromoPostureResult",
    "SlotDemandCell",
    "SlotMenuCandidateItem",
    "SlotMenuCandidatesCell",
    "SlotMenuCandidatesOptions",
    "SlotMenuCandidatesResult",
    "VenueSlotPerformanceCell",
    "VenueSlotPerformanceSummary",
    "calculate_slot_demand_profile",
    "compute_slot_demand_profile_from_orders",
    "compute_slot_menu_candidates",
    "derive_combo_promo_posture",
    "summarize_venue_slot_performance",
    "compute_operating_profile_from_orders",
    "compute_order_metrics_by_day_from_orders",
    "compute_revenue_trends_from_orders",
    "calculate_popularity_index",
    "BestPostingWindowInput",
    "InstagramSignalMenuItem",
    "PromotionCandidatesResult",
    "PromotionMenuItemForCandidates",
    "PromotionRankedCandidate",
    "PuzzleOpportunityPool",
    "PuzzleSelectedCandidate",
    "calculate_promotion_candidates",
    "compute_menu_engineering_promotion_candidates",
    "calculate_menu_engineering_matrix",
    "compute_menu_engineering_from_orders",
    "category_mix_columns",
    "ensure_optional_category_columns",
    "extract_menu_items",
    "extract_menu_items_required_columns",
    "heatmap_columns",
    "line_item_columns_full",
    "menu_basket_affinities_columns",
    "menu_engineering_columns",
    "popularity_index_columns",
    "require_columns",
    "revenue_trends_columns",
    "slot_demand_columns",
    "weekly_demand_columns",
    "detect_pos_from_excel_bytes",
    "get_normalizer",
    "NORMALIZERS",
    "AnalyticsCapabilities",
    "FundamentalSignals",
    "AdditionalSignals",
    "DatetimeSignals",
]
