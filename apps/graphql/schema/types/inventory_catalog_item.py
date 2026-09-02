from datetime import datetime
from enum import StrEnum

import strawberry


@strawberry.enum(description="Primary storage area for a pantry item.")
class InventoryStorageZone(StrEnum):
    freezer = "freezer"
    cooler = "cooler"
    dry = "dry"


@strawberry.type(description="Workspace pantry catalog item (name and package label).")
class InventoryCatalogItemType:
    id: int
    workspaceId: int
    name: str
    packageSize: float
    packageUnit: str
    price: float | None
    storageZone: InventoryStorageZone
    createdAt: datetime
    updatedAt: datetime
