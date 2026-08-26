from datetime import datetime

import strawberry

from graphql.schema.types.inventory_catalog_item import InventoryCatalogItemType


@strawberry.type(description="Location stock level for a pantry catalog item.")
class InventoryStockType:
    id: int
    locationId: int
    catalogItemId: int
    onHand: float
    catalogItem: InventoryCatalogItemType
    createdAt: datetime
    updatedAt: datetime
