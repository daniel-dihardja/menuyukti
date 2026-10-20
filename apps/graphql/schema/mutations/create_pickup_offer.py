"""Owner mutation: create a pickup offer for a location."""

from __future__ import annotations

import strawberry

import graphql.services.pickup_offers as offer_svc
from graphql.context import request_session_scope
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.pickup_offers import pickup_offer_to_gql
from graphql.schema.types.pickup_offer import CreatePickupOfferInput, PickupOfferType


@strawberry.type
class CreatePickupOfferMutation:
    @strawberry.mutation(
        description=(
            "Create a pickup offer for a location. Requires location ownership and an "
            "active pickup_offer subscription. Rejects when another open offer exists."
        )
    )
    def create_pickup_offer(
        self,
        info: strawberry.Info,
        input: CreatePickupOfferInput,
    ) -> PickupOfferType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createPickupOffer")
        with request_session_scope(info) as session:
            require_location_owner(session, input.location_id, user_id, info=info)
            view = offer_svc.create_pickup_offer(
                session,
                location_id=input.location_id,
                title=input.title,
                description=input.description,
                available_from=input.available_from,
                available_until=input.available_until,
                price=input.price,
            )
            session.commit()
            return pickup_offer_to_gql(view)
