"""GraphQL types for inventar refill forecast."""

from enum import StrEnum

import strawberry

from graphql.schema.types.inventory_catalog_item import InventoryStorageZone


@strawberry.enum(description="Confidence of a refill forecast row.")
class InventoryRefillForecastConfidence(StrEnum):
    ok = "ok"
    insufficient_history = "insufficient_history"


@strawberry.type(description="One catalog item ranked by estimated days until refill.")
class InventoryRefillForecastItem:
    catalogItemId: int
    name: str
    storageZone: InventoryStorageZone
    onHand: float
    minOnHand: float | None
    avgDailyOut: float
    daysUntilRefill: float | None
    priorityRank: int
    confidence: InventoryRefillForecastConfidence
    windowDays: int
