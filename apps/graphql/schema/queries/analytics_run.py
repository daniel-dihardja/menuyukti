from collections import defaultdict
from datetime import date, datetime
from typing import Optional

import strawberry

from graphql.data_sources import (
    AnalyticsRun,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
)
from graphql.schema.auth import (
    get_analytics_run_if_owner,
    is_location_owner,
    user_id_from_info,
)
from graphql.schema.types import MenuItemCogsType
from menuyukti.core.analytics import compute_menu_heatmaps_from_orders
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)


@strawberry.type(description="Average order size and revenue for an analytics run.")
class AnalyticsRunOrderMetricsType:
    avgOrderSize: float
    avgOrderRevenue: float


@strawberry.type(description="Hourly demand distribution for a menu item.")
class DailyHeatmapType:
    hour: int
    quantity: int


@strawberry.type(description="Day-of-week demand distribution for a menu item.")
class WeeklyHeatmapType:
    day: str
    quantity: int


@strawberry.type(
    description=(
        "Hourly and day-of-week demand heatmaps for a single menu item. "
        "Use this to understand when a dish sells best."
    )
)
class MenuHeatmapType:
    menu: str
    menu_category: Optional[str]
    menu_category_detail: Optional[str]
    daily_heatmap: list[DailyHeatmapType]
    weekly_heatmap: list[WeeklyHeatmapType]


@strawberry.type(
    description=(
        "Portfolio-level thresholds used to classify menu items in the engineering matrix. "
        "avgPopularity and avgContributionMargin are the BCG quadrant cut-off values."
    )
)
class MenuEngineeringThresholdsType:
    avgPopularity: float
    avgContributionMargin: float
    totalCogs: float
    totalProfit: float
    totalMargin: float


@strawberry.type(
    description="Share of items and margin contribution per BCG category (star, puzzle, plow_horse, low_end)."
)
class MenuEngineeringDistributionItemType:
    category: str
    itemCount: int
    itemShare: float
    marginShare: float


@strawberry.type(
    description=(
        "A single menu item's position in the menu engineering BCG matrix, including its "
        "classification (star, puzzle, plow_horse, low_end) and recommended action."
    )
)
class MenuEngineeringMatrixItemType:
    menu: str
    quantity: int
    totalRevenue: float
    cogs: float
    totalCogs: float
    contributionMargin: float
    contributionMarginPercentage: float
    marginPerUnit: float
    weValue: float
    category: str
    action: str
    menuCategory: Optional[str]
    menuCategoryDetail: Optional[str]


@strawberry.type(
    description=(
        "Full menu engineering BCG matrix for an analytics run. "
        "Contains portfolio thresholds, per-category distribution, and per-item classification."
    )
)
class MenuEngineeringMatrixType:
    thresholds: MenuEngineeringThresholdsType
    distribution: list[MenuEngineeringDistributionItemType]
    items: list[MenuEngineeringMatrixItemType]


@strawberry.type(
    description=(
        "Metadata for a single analytics run — period, POS system, and per-menu COGS records. "
        "Use menuEngineeringMatrix, menuHeatmaps, or orderMetrics queries for computed analytics."
    )
)
class AnalyticsRunType:
    id: strawberry.ID
    name: str
    filename: str
    posSystem: str
    periodStart: Optional[date]
    periodEnd: Optional[date]
    createdAt: datetime
    locationId: int
    menuItemCogs: list[MenuItemCogsType]


@strawberry.type(description="Minimal fields for listing analytics runs by location.")
class AnalyticsRunListItemType:
    id: strawberry.ID
    name: str
    filename: str


# ---------------------------------------------------------------------------
# Private computation helpers
# ---------------------------------------------------------------------------

def _compute_order_metrics(
    session, run: AnalyticsRun
) -> AnalyticsRunOrderMetricsType:
    rows = (
        session.query(OrderFact)
        .where(OrderFact.analytics_run_id == run.id)
        .all()
    )

    if not rows:
        return AnalyticsRunOrderMetricsType(
            avgOrderSize=0.0,
            avgOrderRevenue=0.0,
        )

    orders = defaultdict(list)
    for row in rows:
        orders[row.bill_number].append(row)

    order_sizes: list[int] = []
    order_revenues: list[float] = []
    for group in orders.values():
        order_sizes.append(len(group))
        order_revenues.append(
            float(sum(r.total_after_bill_discount for r in group))
        )

    avg_order_size = float(sum(order_sizes)) / len(order_sizes)
    avg_order_revenue = float(sum(order_revenues)) / len(order_revenues)

    return AnalyticsRunOrderMetricsType(
        avgOrderSize=avg_order_size,
        avgOrderRevenue=avg_order_revenue,
    )


def _compute_menu_heatmaps(
    session, run: AnalyticsRun
) -> list[MenuHeatmapType]:
    rows = (
        session.query(OrderFact)
        .where(OrderFact.analytics_run_id == run.id)
        .all()
    )

    if not rows:
        return []

    order_rows = [
        {
            "menu": r.menu,
            "qty": r.qty,
            "order_time": r.order_time,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in rows
    ]
    payloads = compute_menu_heatmaps_from_orders(order_rows)

    result: list[MenuHeatmapType] = []
    for payload in payloads:
        daily_heatmap = [
            DailyHeatmapType(
                hour=row["hour"],
                quantity=row["quantity"],
            )
            for row in payload["daily_heatmap"]
        ]
        weekly_heatmap = [
            WeeklyHeatmapType(
                day=row["day"],
                quantity=row["quantity"],
            )
            for row in payload["weekly_heatmap"]
        ]
        result.append(
            MenuHeatmapType(
                menu=payload["menu"],
                menu_category=payload["menu_category"],
                menu_category_detail=payload["menu_category_detail"],
                daily_heatmap=daily_heatmap,
                weekly_heatmap=weekly_heatmap,
            )
        )

    return result


def _compute_menu_engineering_matrix(
    session, run: AnalyticsRun
) -> Optional[MenuEngineeringMatrixType]:
    rows = (
        session.query(OrderFact)
        .where(OrderFact.analytics_run_id == run.id)
        .all()
    )

    if not rows:
        return None

    order_rows = [
        {
            "menu": r.menu,
            "qty": r.qty,
            "total_after_bill_discount": r.total_after_bill_discount,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in rows
    ]

    cogs_rows = (
        session.query(MenuItemCogs)
        .where(MenuItemCogs.analytics_run_id == run.id)
        .all()
    )
    cogs_by_menu = {r.menu: float(r.cogs) for r in cogs_rows}

    try:
        result = compute_menu_engineering_from_orders(order_rows, cogs_by_menu)
    except ValueError:
        return None

    thresholds = result["thresholds"]
    thresholds_type = MenuEngineeringThresholdsType(
        avgPopularity=thresholds["avg_popularity"],
        avgContributionMargin=thresholds["avg_contribution_margin"],
        totalCogs=thresholds["total_cogs"],
        totalProfit=thresholds["total_profit"],
        totalMargin=thresholds["total_margin"],
    )

    distribution_type = [
        MenuEngineeringDistributionItemType(
            category=d["category"],
            itemCount=d["item_count"],
            itemShare=d["item_share"],
            marginShare=d["margin_share"],
        )
        for d in result["distribution"]
    ]

    items_type = [
        MenuEngineeringMatrixItemType(
            menu=item["menu"],
            quantity=item["quantity"],
            totalRevenue=item["total_revenue"],
            cogs=item["cogs"],
            totalCogs=item["total_cogs"],
            contributionMargin=item["contribution_margin"],
            contributionMarginPercentage=item["contribution_margin_percentage"],
            marginPerUnit=item["margin_per_unit"],
            weValue=item["we_value"],
            category=item["category"],
            action=item["action"],
            menuCategory=item.get("menu_category"),
            menuCategoryDetail=item.get("menu_category_detail"),
        )
        for item in result["items"]
    ]

    return MenuEngineeringMatrixType(
        thresholds=thresholds_type,
        distribution=distribution_type,
        items=items_type,
    )


def _run_to_type(session, run: AnalyticsRun) -> AnalyticsRunType:
    cogs_rows = (
        session.query(MenuItemCogs)
        .where(MenuItemCogs.analytics_run_id == run.id)
        .all()
    )
    menu_item_cogs = [
        MenuItemCogsType(
            id=row.id,
            analyticsRunId=row.analytics_run_id,
            menu=row.menu,
            menuCategory=row.menu_category,
            menuCategoryDetail=row.menu_category_detail,
            cogs=row.cogs,
            currency=row.currency,
            createdAt=row.created_at,
            updatedAt=row.updated_at,
        )
        for row in cogs_rows
    ]
    return AnalyticsRunType(
        id=run.id,
        name=run.name,
        filename=run.filename,
        posSystem=run.pos_system,
        periodStart=run.period_start,
        periodEnd=run.period_end,
        createdAt=run.created_at,
        locationId=run.location_id,
        menuItemCogs=menu_item_cogs,
    )


# ---------------------------------------------------------------------------
# Query mixin
# ---------------------------------------------------------------------------

@strawberry.type
class AnalyticsRunQuery:
    @strawberry.field(
        description="Fetch metadata and COGS for a single analytics run by ID."
    )
    def analytics_run(
        self, info: strawberry.Info, id: strawberry.ID
    ) -> Optional[AnalyticsRunType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(id), user_id)
            if run is None:
                return None
            return _run_to_type(session, run)
        finally:
            session.close()

    @strawberry.field(
        description="List analytics runs for a location, newest first."
    )
    def analytics_runs(
        self, info: strawberry.Info, location_id: int
    ) -> list[AnalyticsRunListItemType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            if not is_location_owner(session, location_id, user_id):
                return []
            runs = (
                session.query(AnalyticsRun)
                .where(AnalyticsRun.location_id == location_id)
                .order_by(AnalyticsRun.id.desc())
                .all()
            )
            return [
                AnalyticsRunListItemType(
                    id=run.id,
                    name=run.name,
                    filename=run.filename,
                )
                for run in runs
            ]
        finally:
            session.close()

    @strawberry.field(
        description=(
            "Compute average order size and revenue for an analytics run. "
            "Returns None if the run has no order data."
        )
    )
    def order_metrics(
        self, info: strawberry.Info, analytics_run_id: strawberry.ID
    ) -> Optional[AnalyticsRunOrderMetricsType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            return _compute_order_metrics(session, run)
        finally:
            session.close()

    @strawberry.field(
        description=(
            "Return hourly and day-of-week demand heatmaps for every menu item in an analytics run. "
            "Use this to identify peak selling times per dish."
        )
    )
    def menu_heatmaps(
        self, info: strawberry.Info, analytics_run_id: strawberry.ID
    ) -> list[MenuHeatmapType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return []
            return _compute_menu_heatmaps(session, run)
        finally:
            session.close()

    @strawberry.field(
        description=(
            "Compute the menu engineering BCG matrix for an analytics run. "
            "Requires COGS to be set; returns None if no COGS are available. "
            "Optionally filter returned items to specific categories "
            "(star, puzzle, plow_horse, low_end) — thresholds and distribution "
            "always reflect the full dataset."
        )
    )
    def menu_engineering_matrix(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        categories: Optional[list[str]] = None,
    ) -> Optional[MenuEngineeringMatrixType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            matrix = _compute_menu_engineering_matrix(session, run)
            if matrix is None or not categories:
                return matrix
            category_set = set(categories)
            filtered_items = [i for i in matrix.items if i.category in category_set]
            return MenuEngineeringMatrixType(
                thresholds=matrix.thresholds,
                distribution=matrix.distribution,
                items=filtered_items,
            )
        finally:
            session.close()
