"""Owner pickup offer queries."""

from __future__ import annotations

import strawberry

import graphql.services.pickup_offers as offer_svc
from graphql.context import request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.pickup_offer import PickupOfferType


def pickup_offer_to_gql(view: offer_svc.PickupOfferView) -> PickupOfferType:
    return PickupOfferType(
        id=view.id,
        location_id=view.location_id,
        location_name=view.location_name,
        title=view.title,
        description=view.description,
        status=view.status,
        available_from=view.available_from,
        available_until=view.available_until,
        price=view.price,
        created_at=view.created_at,
        is_live=view.is_live,
    )


@strawberry.type
class PickupOffersQuery:
    @strawberry.field(
        description=(
            "List pickup offers for a location. Requires location ownership. "
            "Empty when unauthenticated or not an owner."
        )
    )
    def pickup_offers(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> list[PickupOfferType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return []
            return [
                pickup_offer_to_gql(view)
                for view in offer_svc.list_pickup_offers_for_location(session, location_id)
            ]
