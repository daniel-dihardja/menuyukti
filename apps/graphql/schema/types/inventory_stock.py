from datetime import date, datetime

import strawberry

from graphql.schema.types.inventory_catalog_item import InventoryCatalogItemType


@strawberry.type(description="Location stock level for a pantry catalog item.")
class InventoryStockType:
    id: int
    locationId: int
    catalogItemId: int
    onHand: float
    lastInOn: date | None
    lastOutOn: date | None
    lastUpdatedByClerkUserId: str | None
    catalogItem: InventoryCatalogItemType
    createdAt: datetime
    updatedAt: datetime


@strawberry.type(description="Result of moving packages between locations.")
class InventoryStockTransferResult:
    fromStock: InventoryStockType | None
    toStock: InventoryStockType
    fromLocationId: int
    toLocationId: int
