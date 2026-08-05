import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun, Location, LocationMenuItemCogs, MenuItemCogs
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import LocationMenuItemCogsType, MenuItemCogsType
from graphql.services.location_cogs import (
    LocationCogsUpsertItem,
    apply_location_cogs_to_run,
    copy_run_cogs_to_location,
    upsert_location_cogs_bulk,
)


@strawberry.input
class LocationMenuItemCogsUpsertInput:
    menuName: str
    cogs: float
    menuCategory: str | None = None
    menuCategoryDetail: str | None = None
    currency: str | None = None


def _location_cogs_to_gql(row: LocationMenuItemCogs) -> LocationMenuItemCogsType:
    return LocationMenuItemCogsType(
        id=row.id,
        locationId=row.location_id,
        menu=row.menu,
        menuCategory=row.menu_category,
        menuCategoryDetail=row.menu_category_detail,
        cogs=row.cogs,
        currency=row.currency,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


def _run_cogs_to_gql(row: MenuItemCogs) -> MenuItemCogsType:
    return MenuItemCogsType(
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


def _parse_positive_id(raw: strawberry.ID, label: str) -> int:
    try:
        pk = int(str(raw))
    except ValueError as e:
        raise ValueError(f"Invalid {label}") from e
    if pk < 1:
        raise ValueError(f"Invalid {label}")
    return pk


@strawberry.type
class UpsertLocationMenuItemCogsBulkMutation:
    @strawberry.mutation
    def upsert_location_menu_item_cogs_bulk(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
        items: list[LocationMenuItemCogsUpsertInput],
    ) -> list[LocationMenuItemCogsType]:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for upsertLocationMenuItemCogsBulk")
        if not items:
            return []

        loc_pk = _parse_positive_id(location_id, "location id")
        with request_session_scope(info) as session:
            loc = session.get(Location, loc_pk)
            if loc is None:
                raise ValueError("Location not found")
            require_location_owner(session, loc_pk, user_id)

            domain_items = [
                LocationCogsUpsertItem(
                    menu_name=item.menuName,
                    cogs=item.cogs,
                    menu_category=item.menuCategory,
                    menu_category_detail=item.menuCategoryDetail,
                    currency=item.currency,
                )
                for item in items
            ]
            touched = upsert_location_cogs_bulk(session, loc_pk, domain_items)
            session.commit()
            for row in touched:
                session.refresh(row)
            return [_location_cogs_to_gql(row) for row in touched]


@strawberry.type
class ApplyLocationCogsToAnalyticsRunMutation:
    @strawberry.mutation(
        description="Refresh an analytics run's COGS snapshot from its location catalog."
    )
    def apply_location_cogs_to_analytics_run(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
    ) -> list[MenuItemCogsType]:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for applyLocationCogsToAnalyticsRun")

        run_pk = _parse_positive_id(analytics_run_id, "analytics run id")
        with request_session_scope(info) as session:
            run = session.get(AnalyticsRun, run_pk)
            if run is None:
                raise ValueError("Analytics run not found")
            require_location_owner(session, run.location_id, user_id)

            touched = apply_location_cogs_to_run(
                session,
                analytics_run_id=run_pk,
                location_id=run.location_id,
            )
            session.commit()
            for row in touched:
                session.refresh(row)
            return [_run_cogs_to_gql(row) for row in touched]


@strawberry.type
class SaveAnalyticsRunCogsToLocationMutation:
    @strawberry.mutation(
        description="Promote an analytics run's COGS snapshot into the location catalog."
    )
    def save_analytics_run_cogs_to_location(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
    ) -> list[LocationMenuItemCogsType]:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for saveAnalyticsRunCogsToLocation")

        run_pk = _parse_positive_id(analytics_run_id, "analytics run id")
        with request_session_scope(info) as session:
            run = session.get(AnalyticsRun, run_pk)
            if run is None:
                raise ValueError("Analytics run not found")
            require_location_owner(session, run.location_id, user_id)

            touched = copy_run_cogs_to_location(
                session,
                analytics_run_id=run_pk,
                location_id=run.location_id,
            )
            session.commit()
            for row in touched:
                session.refresh(row)
            return [_location_cogs_to_gql(row) for row in touched]
