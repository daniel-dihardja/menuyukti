from datetime import date, datetime
from enum import Enum

import strawberry


@strawberry.enum(description="Direction of an inventar stock movement.")
class InventoryStockMovementDirection(Enum):
    in_ = strawberry.enum_value("in", name="in")
    out = "out"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"


@strawberry.type(description="One receive, use, or transfer leg for pantry stock.")
class InventoryStockMovementType:
    id: int
    locationId: int
    catalogItemId: int
    stockId: int | None
    direction: InventoryStockMovementDirection
    quantity: float
    occurredOn: date
    note: str | None
    relatedMovementId: int | None
    relatedLocationId: int | None
    createdByClerkUserId: str | None
    createdAt: datetime
