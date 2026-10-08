"""GraphQL type for location-scoped service subscriptions."""

from datetime import datetime

import strawberry


@strawberry.type(
    description=(
        "Entitlement for a catalog service on one location (digital_menu, stamp_card, cashback)."
    )
)
class ServiceSubscriptionType:
    id: strawberry.ID
    workspace_id: strawberry.ID
    location_id: strawberry.ID
    service_key: str
    status: str
    created_at: datetime | None
    updated_at: datetime | None
    canceled_at: datetime | None
