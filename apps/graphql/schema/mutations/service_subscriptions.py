"""Activate / cancel location-scoped service subscriptions."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.service_subscriptions import _subscription_to_gql
from graphql.schema.types.service_subscription import ServiceSubscriptionType
from graphql.services.service_subscriptions import activate_subscription, cancel_subscription


@strawberry.type
class ActivateServiceSubscriptionMutation:
    @strawberry.mutation(
        description=(
            "Activate (or re-activate) a service subscription for a location. "
            "Requires location ownership. Idempotent upsert to status=active."
        )
    )
    def activate_service_subscription(
        self,
        info: strawberry.Info,
        location_id: int,
        service_key: str,
    ) -> ServiceSubscriptionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for activateServiceSubscription")
        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = session.get(Location, location_id)
            if location is None:
                raise ValueError("Location not found")
            row = activate_subscription(session, location=location, service_key=service_key)
            session.commit()
            session.refresh(row)
            return _subscription_to_gql(row)


@strawberry.type
class CancelServiceSubscriptionMutation:
    @strawberry.mutation(
        description=(
            "Cancel a service subscription for a location. Requires location ownership. "
            "Canceling digital_menu also unpublishes the public menu."
        )
    )
    def cancel_service_subscription(
        self,
        info: strawberry.Info,
        location_id: int,
        service_key: str,
    ) -> ServiceSubscriptionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for cancelServiceSubscription")
        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = session.get(Location, location_id)
            if location is None:
                raise ValueError("Location not found")
            row = cancel_subscription(session, location=location, service_key=service_key)
            session.commit()
            session.refresh(row)
            return _subscription_to_gql(row)
