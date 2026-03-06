from collections import defaultdict
from datetime import date, datetime
from typing import Optional

import strawberry

from graphql.data_sources import (
    AnalyticsRun,
    Location,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
)
from graphql.reports.heatmaps import calculate_menu_heatmaps_from_rows


@strawberry.type
class LocationType:
    id: strawberry.ID
    name: str


@strawberry.type
class MenuItemCogsType:
    id: strawberry.ID
    analyticsRunId: int
    menu: str
    menuCategory: Optional[str]
    menuCategoryDetail: Optional[str]
    cogs: float
    currency: Optional[str]
    createdAt: datetime
    updatedAt: datetime


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

    payloads = calculate_menu_heatmaps_from_rows(rows)

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
    )


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello from GraphQL"

    @strawberry.field
    def locations(self) -> list[LocationType]:
        session = SessionLocal()
        try:
            rows = session.query(Location).all()
            return [LocationType(id=row.id, name=row.name) for row in rows]
        finally:
            session.close()

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
    def analytics_runs(self) -> list[AnalyticsRunType]:
        session = SessionLocal()
        try:
            runs = session.query(AnalyticsRun).all()
            return [_run_to_type(session, run) for run in runs]
        finally:
            session.close()
