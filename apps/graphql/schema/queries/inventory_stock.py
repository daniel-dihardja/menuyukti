"""Query location stock levels for inventar."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.inventory import stock_to_gql
from graphql.schema.types.inventory_stock import InventoryStockType


@strawberry.type
class InventoryStockQuery:
    @strawberry.field(
        description="Stock levels at a location (joined with catalog). Empty when not authorized."
    )
    def inventory_stock(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
    ) -> list[InventoryStockType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        try:
            loc_pk = int(str(location_id))
        except ValueError:
            return []
        if loc_pk < 1:
            return []

        with request_session_scope(info) as session:
            if not is_location_owner(session, loc_pk, user_id, info=info):
                return []
            rows = (
                session.scalars(
                    select(InventoryStock)
                    .join(
                        InventoryCatalogItem,
                        InventoryStock.catalog_item_id == InventoryCatalogItem.id,
                    )
                    .options(joinedload(InventoryStock.catalog_item))
                    .where(InventoryStock.location_id == loc_pk)
                    .order_by(
                        InventoryCatalogItem.name.asc(),
                        InventoryCatalogItem.package_size.asc(),
                    )
                )
                .unique()
                .all()
            )
            return [stock_to_gql(row) for row in rows]
