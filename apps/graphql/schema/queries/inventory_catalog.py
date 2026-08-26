"""Query workspace pantry catalog items."""

from __future__ import annotations

import strawberry
from sqlalchemy import select

from graphql.context import request_session_scope
from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.mappers.inventory import catalog_item_to_gql
from graphql.schema.types.inventory_catalog_item import InventoryCatalogItemType


@strawberry.type
class InventoryCatalogQuery:
    @strawberry.field(
        description="Pantry catalog for a workspace. Empty when unauthenticated or not a member."
    )
    def inventory_catalog_items(
        self,
        info: strawberry.Info,
        workspace_id: strawberry.ID,
    ) -> list[InventoryCatalogItemType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        try:
            ws_pk = int(str(workspace_id))
        except ValueError:
            return []
        if ws_pk < 1:
            return []

        with request_session_scope(info) as session:
            if not is_workspace_member(session, ws_pk, user_id):
                return []
            rows = session.scalars(
                select(InventoryCatalogItem)
                .where(InventoryCatalogItem.workspace_id == ws_pk)
                .order_by(
                    InventoryCatalogItem.name.asc(),
                    InventoryCatalogItem.package_size.asc(),
                )
            ).all()
            return [catalog_item_to_gql(row) for row in rows]
