"""Owner mutation: close a pickup offer early."""

from __future__ import annotations

import strawberry

import graphql.services.pickup_offers as offer_svc
from graphql.context import request_session_scope
from graphql.data_sources.models.pickup_offer import PickupOffer
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.pickup_offers import pickup_offer_to_gql
from graphql.schema.types.pickup_offer import PickupOfferType


@strawberry.type
class ClosePickupOfferMutation:
    @strawberry.mutation(
        description=(
            "Close a pickup offer (e.g. sold out). Requires location ownership "
            "and an active pickup_offer subscription."
        )
    )
    def close_pickup_offer(
        self,
        info: strawberry.Info,
        offer_id: int,
    ) -> PickupOfferType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for closePickupOffer")
        with request_session_scope(info) as session:
            row = session.get(PickupOffer, offer_id)
            if row is None:
                raise ValueError("Pickup offer not found")
            require_location_owner(session, int(row.location_id), user_id, info=info)
            view = offer_svc.close_pickup_offer(
                session,
                offer_id=offer_id,
                location_id=int(row.location_id),
            )
            session.commit()
            return pickup_offer_to_gql(view)
