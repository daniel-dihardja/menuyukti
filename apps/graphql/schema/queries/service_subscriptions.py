"""Query myServiceSubscriptions for the signed-in user's workspaces."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.service_subscription import ServiceSubscription
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.service_subscription import ServiceSubscriptionType
from graphql.services.service_subscriptions import SERVICE_STATUS_ACTIVE
from graphql.services.workspace_scope import workspace_ids_for_user


def _subscription_to_gql(row: ServiceSubscription) -> ServiceSubscriptionType:
    return ServiceSubscriptionType(
        id=str(row.id),
        workspace_id=str(row.workspace_id),
        location_id=str(row.location_id),
        service_key=row.service_key,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        canceled_at=row.canceled_at,
    )


@strawberry.type
class ServiceSubscriptionsQuery:
    @strawberry.field(
        description=(
            "Service subscriptions for workspaces the current user belongs to. "
            "Defaults to active only; set includeCanceled for history."
        )
    )
    def my_service_subscriptions(
        self,
        info: strawberry.Info,
        include_canceled: bool = False,
    ) -> list[ServiceSubscriptionType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            workspace_ids = workspace_ids_for_user(session, user_id)
            if not workspace_ids:
                return []
            query = session.query(ServiceSubscription).filter(
                ServiceSubscription.workspace_id.in_(workspace_ids)
            )
            if not include_canceled:
                query = query.filter(ServiceSubscription.status == SERVICE_STATUS_ACTIVE)
            rows = query.order_by(
                ServiceSubscription.service_key.asc(),
                ServiceSubscription.location_id.asc(),
            ).all()
            return [_subscription_to_gql(r) for r in rows]
