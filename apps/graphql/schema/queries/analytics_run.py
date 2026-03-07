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
from graphql.schema.types import MenuItemCogsType
from menuyukti.core.analytics import compute_menu_heatmaps_from_orders
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)


@strawberry.type
class AnalyticsRunOrderMetricsType:
    avgOrderSize: float
    avgOrderRevenue: float


@strawberry.type
class DailyHeatmapType:
    hour: int
    quantity: int


@strawberry.type
class WeeklyHeatmapType:
    day: str
    quantity: int


@strawberry.type
class MenuHeatmapType:
    menu: str
    menu_category: Optional[str]
    menu_category_detail: Optional[str]
    daily_heatmap: list[DailyHeatmapType]
    weekly_heatmap: list[WeeklyHeatmapType]


@strawberry.type
class MenuEngineeringThresholdsType:
    avgPopularity: float
    avgContributionMargin: float
    totalCogs: float
    totalProfit: float
    totalMargin: float


@strawberry.type
class MenuEngineeringDistributionItemType:
    category: str
    itemCount: int
    itemShare: float
    marginShare: float


@strawberry.type
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


@strawberry.type
class MenuEngineeringMatrixType:
    thresholds: MenuEngineeringThresholdsType
    distribution: list[MenuEngineeringDistributionItemType]
    items: list[MenuEngineeringMatrixItemType]


@strawberry.type
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
    orderMetrics: AnalyticsRunOrderMetricsType
    menu_heatmaps: list[MenuHeatmapType]
    menuEngineeringMatrix: Optional[MenuEngineeringMatrixType]


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
    order_metrics = _compute_order_metrics(session, run)
    menu_heatmaps = _compute_menu_heatmaps(session, run)
    menu_engineering_matrix = _compute_menu_engineering_matrix(session, run)
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
        orderMetrics=order_metrics,
        menu_heatmaps=menu_heatmaps,
        menuEngineeringMatrix=menu_engineering_matrix,
    )


@strawberry.type
class AnalyticsRunListItemType:
    """Minimal fields for listing analytics runs by location."""
    id: strawberry.ID
    name: str
    filename: str


@strawberry.type
class AnalyticsRunQuery:
    @strawberry.field
    def analytics_run(self, id: strawberry.ID) -> Optional[AnalyticsRunType]:
        session = SessionLocal()
        try:
            run = session.get(AnalyticsRun, int(id))
            if run is None:
                return None
            return _run_to_type(session, run)
        finally:
            session.close()

    @strawberry.field
    def analytics_runs(self, location_id: int) -> list[AnalyticsRunListItemType]:
        """List analytics runs for a location, newest first."""
        session = SessionLocal()
        try:
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
