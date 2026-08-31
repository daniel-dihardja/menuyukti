"""ORM → GraphQL mappers for inventar catalog and stock."""

from __future__ import annotations

from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
from graphql.schema.types.inventory_catalog_item import (
    InventoryCatalogItemType,
    InventoryStorageZone,
)
from graphql.schema.types.inventory_stock import InventoryStockType
from graphql.schema.types.inventory_stock_movement import (
    InventoryStockMovementDirection,
    InventoryStockMovementType,
)


def catalog_item_to_gql(row: InventoryCatalogItem) -> InventoryCatalogItemType:
    return InventoryCatalogItemType(
        id=row.id,
        workspaceId=row.workspace_id,
        name=row.name,
        packageSize=row.package_size,
        packageUnit=row.package_unit,
        storageZone=InventoryStorageZone(row.storage_zone),
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


def stock_to_gql(row: InventoryStock) -> InventoryStockType:
    return InventoryStockType(
        id=row.id,
        locationId=row.location_id,
        catalogItemId=row.catalog_item_id,
        onHand=row.on_hand,
        lastInOn=row.last_in_on,
        lastOutOn=row.last_out_on,
        catalogItem=catalog_item_to_gql(row.catalog_item),
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


def movement_to_gql(row: InventoryStockMovement) -> InventoryStockMovementType:
    related = row.related_movement
    return InventoryStockMovementType(
        id=row.id,
        locationId=row.location_id,
        catalogItemId=row.catalog_item_id,
        stockId=row.stock_id,
        direction=InventoryStockMovementDirection(row.direction),
        quantity=row.quantity,
        occurredOn=row.occurred_on,
        note=row.note,
        relatedMovementId=row.related_movement_id,
        relatedLocationId=related.location_id if related is not None else None,
        createdAt=row.created_at,
    )
