"""Analytics entry points for the menuyukti package.

**Pandas pipelines** (``calculate_<name>(df)`` / ``compute_<name>_from_orders``):

1. Colocate a ``TypedDict`` for line-level input rows with the module (see
   ``OrderRowForHeatmap``, ``OrderRowForMatrix``, ``OrderRowForCategoryMix``, etc.).
2. Implement ``calculate_<name>(df: pd.DataFrame)`` and call
   ``require_columns`` (from ``frame_contracts``) with the matching
   ``*_columns()`` helper (e.g. ``category_mix_columns``,
   ``revenue_trends_columns``, ``line_item_columns_full``) so missing
   columns fail with ``ValueError`` instead of ``KeyError``.
3. Expose ``compute_<name>_from_orders(rows: list[...])`` that builds
   ``pd.DataFrame(rows)`` and delegates to ``calculate_<name>``.
4. Prefer vectorized groupby/merge/resample; avoid row loops except where the
   output shape is inherently per-entity (e.g. heatmaps per menu).

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
GraphQL and agents should map persisted or API rows to those TypedDicts or call
``apps/graphql`` helpers that delegate here — see the repo skill
``.agents/skills/menuyukti-analytics/SKILL.md``.
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
from menuyukti.core.analytics.calculate_menu_heatmaps import (
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
    OrderRowForProfile,
    compute_operating_profile_from_orders,
)
from menuyukti.core.analytics.calculate_popularity_index import (
    calculate_popularity_index,
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
    OrderRowForSalesAnalytics,
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
    line_item_columns_full,
    popularity_index_columns,
    require_columns,
    revenue_trends_columns,
)
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes

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
    "OperatingProfileResult",
    "OrderRowForCategoryMix",
    "OrderRowForMatrix",
    "OrderRowForHeatmap",
    "OrderRowForProfile",
    "OrderRowForRevenueTrends",
    "OrderRowForSalesAnalytics",
    "PeriodHeadline",
    "RevenueTrendRow",
    "RevenueTrendsResult",
    "WeeklyHeatmapRow",
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
    "compute_operating_profile_from_orders",
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
    "calculate_menu_engineering_matrix",
    "compute_menu_engineering_from_orders",
    "category_mix_columns",
    "ensure_optional_category_columns",
    "extract_menu_items",
    "extract_menu_items_required_columns",
    "line_item_columns_full",
    "popularity_index_columns",
    "require_columns",
    "revenue_trends_columns",
    "detect_pos_from_excel_bytes",
]
