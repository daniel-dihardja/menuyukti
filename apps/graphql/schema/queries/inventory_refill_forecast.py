"""Query inventar refill forecast for a location."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.inventory_catalog_item import InventoryStorageZone
from graphql.schema.types.inventory_refill_forecast import (
    InventoryRefillForecastConfidence,
    InventoryRefillForecastItem,
)
from graphql.services.inventory_forecast import (
    DEFAULT_WINDOW_DAYS,
    compute_inventory_refill_forecast,
)


@strawberry.type
class InventoryRefillForecastQuery:
    @strawberry.field(
        description=(
            "Ranked refill forecast for stock at a location from recent out / "
            "transfer_out burn. Empty when not authorized. windowDays defaults to 14 "
            "and is clamped between 7 and 90."
        )
    )
    def inventory_refill_forecast(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
        window_days: int = DEFAULT_WINDOW_DAYS,
    ) -> list[InventoryRefillForecastItem]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        try:
            loc_pk = int(str(location_id))
        except ValueError:
            return []
        if loc_pk < 1:
            return []

        with request_session_scope(info) as session:
            if not is_location_owner(session, loc_pk, user_id, info=info):
                return []
            rows = compute_inventory_refill_forecast(
                session,
                location_id=loc_pk,
                window_days=window_days,
            )
            return [
                InventoryRefillForecastItem(
                    catalogItemId=row.catalog_item_id,
                    name=row.name,
                    storageZone=InventoryStorageZone(row.storage_zone),
                    onHand=row.on_hand,
                    minOnHand=row.min_on_hand,
                    avgDailyOut=row.avg_daily_out,
                    daysUntilRefill=row.days_until_refill,
                    priorityRank=row.priority_rank,
                    confidence=InventoryRefillForecastConfidence(row.confidence),
                    windowDays=row.window_days,
                )
                for row in rows
            ]
