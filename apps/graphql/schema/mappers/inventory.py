"""ORM → GraphQL mappers for inventar catalog and stock."""

from __future__ import annotations

from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.schema.types.inventory_catalog_item import InventoryCatalogItemType
from graphql.schema.types.inventory_stock import InventoryStockType


def catalog_item_to_gql(row: InventoryCatalogItem) -> InventoryCatalogItemType:
    return InventoryCatalogItemType(
        id=row.id,
        workspaceId=row.workspace_id,
        name=row.name,
        packageSize=row.package_size,
        packageUnit=row.package_unit,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


def stock_to_gql(row: InventoryStock) -> InventoryStockType:
    return InventoryStockType(
        id=row.id,
        locationId=row.location_id,
        catalogItemId=row.catalog_item_id,
        onHand=row.on_hand,
        catalogItem=catalog_item_to_gql(row.catalog_item),
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )
