from datetime import datetime
from enum import StrEnum

import strawberry


@strawberry.enum(description="Primary storage area for a pantry item.")
class InventoryStorageZone(StrEnum):
    freezer = "freezer"
    cooler = "cooler"
    dry = "dry"


@strawberry.enum(description="Product category for a pantry item.")
class InventoryCategory(StrEnum):
    dry_goods = "dry_goods"
    dairy = "dairy"
    produce = "produce"
    proteins = "proteins"
    frozen = "frozen"
    beverages = "beverages"
    spices_condiments = "spices_condiments"
    cleaning = "cleaning"
    packaging = "packaging"
    other = "other"


@strawberry.type(description="Workspace pantry catalog item (name and package label).")
class InventoryCatalogItemType:
    id: int
    workspaceId: int
    name: str
    packageSize: float
    packageUnit: str
    price: float | None
    minOnHand: float | None
    maxOnHand: float | None
    storageZone: InventoryStorageZone
    category: InventoryCategory
    createdAt: datetime
    updatedAt: datetime
