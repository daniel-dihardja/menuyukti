"""Full menu catalog from order facts for the latest analytics run."""

from __future__ import annotations

import strawberry

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, is_location_owner, user_id_from_info
from graphql.services.menu_catalog import build_menu_catalog


@strawberry.type(
    description="One distinct menu line from POS data with aggregated quantity and avg unit price.",
)
class MenuCatalogItemType:
    id: strawberry.ID
    name: str
    category: str
    categoryDetail: str | None
    price: float
    quantity: int
    description: str | None
    isActive: bool


@strawberry.type
class MenuCatalogPayloadType:
    analyticsRunId: strawberry.ID
    items: list[MenuCatalogItemType]


@strawberry.type
class MenuCatalogQuery:
    @strawberry.field(
        description=(
            "Distinct menu items from the latest analytics run for a location: "
            "aggregated from order lines (category, avg unit price). "
            "Returns null when there is no run or no order data."
        )
    )
    def menu_items_catalog(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> MenuCatalogPayloadType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return None
            run = (
                session.query(AnalyticsRun)
                .where(AnalyticsRun.location_id == location_id)
                .order_by(AnalyticsRun.id.desc())
                .first()
            )
            if run is None:
                return None
            raw_items = build_menu_catalog(session, run)
            if not raw_items:
                return None
            items = [
                MenuCatalogItemType(
                    id=strawberry.ID(str(r["id"])),
                    name=str(r["name"]),
                    category=str(r["category"]),
                    categoryDetail=str(r["category_detail"]) if r.get("category_detail") else None,
                    price=float(r["price"]),
                    quantity=int(r.get("quantity", 0)),
                    description=None,
                    isActive=bool(r.get("is_active", True)),
                )
                for r in raw_items
            ]
            return MenuCatalogPayloadType(
                analyticsRunId=strawberry.ID(str(run.id)),
                items=items,
            )

    @strawberry.field(
        description=(
            "Distinct menu items from a specific analytics run: "
            "aggregated from order lines (quantity, category, avg unit price). "
            "Returns null when run is missing/unauthorized or has no order data."
        )
    )
    def menu_items_catalog_for_run(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
    ) -> MenuCatalogPayloadType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id)
            if run is None:
                return None

            raw_items = build_menu_catalog(session, run)
            if not raw_items:
                return None

            items = [
                MenuCatalogItemType(
                    id=strawberry.ID(str(r["id"])),
                    name=str(r["name"]),
                    category=str(r["category"]),
                    categoryDetail=str(r["category_detail"]) if r.get("category_detail") else None,
                    price=float(r["price"]),
                    quantity=int(r.get("quantity", 0)),
                    description=None,
                    isActive=bool(r.get("is_active", True)),
                )
                for r in raw_items
            ]
            return MenuCatalogPayloadType(
                analyticsRunId=strawberry.ID(str(run.id)),
                items=items,
            )
