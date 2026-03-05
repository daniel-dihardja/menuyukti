from datetime import date, datetime
from typing import Optional

import strawberry

from graphql.data_sources import AnalyticsRun, Location, MenuItemCogs, SessionLocal


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
