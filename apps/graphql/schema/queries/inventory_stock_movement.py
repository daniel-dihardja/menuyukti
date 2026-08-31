"""Query inventar stock movement history."""

from __future__ import annotations

import strawberry
from sqlalchemy import select

from graphql.context import request_session_scope
from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.inventory import movement_to_gql
from graphql.schema.types.inventory_stock_movement import InventoryStockMovementType


@strawberry.type
class InventoryStockMovementQuery:
    @strawberry.field(
        description=(
            "Stock movements for a catalog item at a location, newest first. "
            "When stockId is set, only movements for that stock row (current track). "
            "Empty when not authorized."
        )
    )
    def inventory_stock_movements(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
        catalog_item_id: strawberry.ID,
        stock_id: strawberry.ID | None = None,
        limit: int = 50,
    ) -> list[InventoryStockMovementType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        try:
            loc_pk = int(str(location_id))
            catalog_pk = int(str(catalog_item_id))
            stock_pk = int(str(stock_id)) if stock_id is not None else None
        except ValueError:
            return []
        if loc_pk < 1 or catalog_pk < 1:
            return []
        if stock_pk is not None and stock_pk < 1:
            return []
        cap = max(1, min(limit, 200))

        with request_session_scope(info) as session:
            if not is_location_owner(session, loc_pk, user_id, info=info):
                return []
            filters = [
                InventoryStockMovement.location_id == loc_pk,
                InventoryStockMovement.catalog_item_id == catalog_pk,
            ]
            if stock_pk is not None:
                filters.append(InventoryStockMovement.stock_id == stock_pk)
            rows = session.scalars(
                select(InventoryStockMovement)
                .where(*filters)
                .order_by(
                    InventoryStockMovement.occurred_on.desc(),
                    InventoryStockMovement.id.desc(),
                )
                .limit(cap)
            ).all()
            return [movement_to_gql(row) for row in rows]
