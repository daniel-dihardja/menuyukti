from collections import defaultdict
from datetime import date, datetime

import strawberry

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact, SessionLocal
from graphql.limits import (
    DEFAULT_ANALYTICS_RUNS_FIRST,
    MAX_ANALYTICS_RUNS_FIRST,
    clamp_page_size,
)
from graphql.schema.auth import (
    get_analytics_run_if_owner,
    is_location_owner,
    user_id_from_info,
)
from graphql.schema.types import MenuItemCogsType


@strawberry.type(description="Average order size and revenue for an analytics run.")
class AnalyticsRunOrderMetricsType:
    avgOrderSize: float
    avgOrderRevenue: float


@strawberry.type(
    description=(
        "Metadata for a single analytics run — period, POS system, and optional per-menu COGS. "
        "Request `menuItemCogs` only when needed; it loads from the database lazily. "
        "Use menuEngineeringMatrix, menuHeatmaps, or orderMetrics queries for computed analytics."
    )
)
class AnalyticsRunType:
    id: strawberry.ID
    name: str
    filename: str
    posSystem: str
    periodStart: date | None
    periodEnd: date | None
    createdAt: datetime
    locationId: int
    _analytics_run_id: strawberry.Private[int]

    @strawberry.field(
        description="Per-menu COGS rows; queried only when this field appears in the selection set."
    )
    def menuItemCogs(self, info: strawberry.Info) -> list[MenuItemCogsType]:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, self._analytics_run_id, user_id)
            if run is None:
                return []
            cogs_rows = (
                session.query(MenuItemCogs)
                .where(MenuItemCogs.analytics_run_id == self._analytics_run_id)
                .all()
            )
            return [
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


@strawberry.type(description="Minimal fields for listing analytics runs by location.")
class AnalyticsRunListItemType:
    id: strawberry.ID
    name: str
    filename: str


def _compute_order_metrics(session, run: AnalyticsRun) -> AnalyticsRunOrderMetricsType:
    rows = session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).all()

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
        order_revenues.append(float(sum(r.total_after_bill_discount for r in group)))

    avg_order_size = float(sum(order_sizes)) / len(order_sizes)
    avg_order_revenue = float(sum(order_revenues)) / len(order_revenues)

    return AnalyticsRunOrderMetricsType(
        avgOrderSize=avg_order_size,
        avgOrderRevenue=avg_order_revenue,
    )


def _run_to_type(run: AnalyticsRun) -> AnalyticsRunType:
    return AnalyticsRunType(
        id=strawberry.ID(str(run.id)),
        name=run.name,
        filename=run.filename,
        posSystem=run.pos_system,
        periodStart=run.period_start,
        periodEnd=run.period_end,
        createdAt=run.created_at,
        locationId=run.location_id,
        _analytics_run_id=run.id,
    )


@strawberry.type
class AnalyticsRunQuery:
    @strawberry.field(description="Fetch metadata and COGS for a single analytics run by ID.")
    def analytics_run(self, info: strawberry.Info, id: strawberry.ID) -> AnalyticsRunType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(id), user_id)
            if run is None:
                return None
            return _run_to_type(run)

    @strawberry.field(
        description=(
            "List analytics runs for a location, newest first. "
            "Use `first` to cap rows (default 100, max 300)."
        )
    )
    def analytics_runs(
        self,
        info: strawberry.Info,
        location_id: int,
        first: int | None = None,
    ) -> list[AnalyticsRunListItemType]:
        user_id = user_id_from_info(info)
        limit = clamp_page_size(
            first,
            default=DEFAULT_ANALYTICS_RUNS_FIRST,
            maximum=MAX_ANALYTICS_RUNS_FIRST,
        )
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return []
            runs = (
                session.query(AnalyticsRun)
                .where(AnalyticsRun.location_id == location_id)
                .order_by(AnalyticsRun.id.desc())
                .limit(limit)
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

    @strawberry.field(
        description=(
            "Compute average order size and revenue for an analytics run. "
            "Returns None if the run has no order data."
        )
    )
    def order_metrics(
        self, info: strawberry.Info, analytics_run_id: strawberry.ID
    ) -> AnalyticsRunOrderMetricsType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None
            return _compute_order_metrics(session, run)
