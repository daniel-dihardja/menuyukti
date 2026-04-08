"""Analytics entry points for the menuyukti package.

Adding a new analytics pipeline:

1. Colocate a ``TypedDict`` for line-level input rows with the module (see
   ``OrderRowForHeatmap``, ``OrderRowForMatrix``, etc.).
2. Implement ``calculate_<name>(df: pd.DataFrame)`` and call
   :func:`menuyukti.core.analytics.frame_contracts.require_columns` (or related
   helpers) at the start so missing columns fail with ``ValueError``.
3. Expose ``compute_<name>_from_orders(rows: list[...])`` that builds
   ``pd.DataFrame(rows)`` and delegates to ``calculate_<name>``.

Callers outside this package should prefer typed row lists and
``compute_*_from_orders`` over constructing ``DataFrame`` objects ad hoc.
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
from menuyukti.core.analytics.calculate_sales_analytics import (
    OrderRowForSalesAnalytics,
    calculate_sales_analytics,
    compute_sales_analytics_from_orders,
)
from menuyukti.core.analytics.extract_menu_items import extract_menu_items
from menuyukti.core.analytics.frame_contracts import (
    ensure_optional_category_columns,
    extract_menu_items_required_columns,
    line_item_columns_full,
    popularity_index_columns,
    require_columns,
)
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes

__all__ = [
    "DailyHeatmapRow",
    "DayOfWeekRow",
    "DayTypeRow",
    "MealPeriodRow",
    "MenuEngineeringDistributionItem",
    "MenuEngineeringMatrixItem",
    "MenuEngineeringMatrixResult",
    "MenuEngineeringThresholds",
    "MenuHeatmapPayload",
    "OperatingProfileResult",
    "OrderRowForMatrix",
    "OrderRowForHeatmap",
    "OrderRowForProfile",
    "OrderRowForSalesAnalytics",
    "WeeklyHeatmapRow",
    "calculate_sales_analytics",
    "compute_sales_analytics_from_orders",
    "calculate_menu_heatmaps",
    "compute_menu_heatmaps_from_orders",
    "compute_operating_profile_from_orders",
    "calculate_popularity_index",
    "calculate_menu_engineering_matrix",
    "compute_menu_engineering_from_orders",
    "ensure_optional_category_columns",
    "extract_menu_items",
    "extract_menu_items_required_columns",
    "line_item_columns_full",
    "popularity_index_columns",
    "require_columns",
    "detect_pos_from_excel_bytes",
]
