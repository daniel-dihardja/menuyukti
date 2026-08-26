from datetime import datetime

import strawberry


@strawberry.type(description="Workspace pantry catalog item (name and package label).")
class InventoryCatalogItemType:
    id: int
    workspaceId: int
    name: str
    packageSize: float
    packageUnit: str
    createdAt: datetime
    updatedAt: datetime
