"""GraphQL queries for native POS tickets."""

from __future__ import annotations

from datetime import UTC, datetime, time

import strawberry

import graphql.services.pos_orders as pos_svc
from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.pos_order import pos_order_to_gql
from graphql.schema.types.pos_order import PosOrderStatus, PosOrderType


def _start_of_utc_day(when: datetime | None = None) -> datetime:
    now = when or datetime.now(UTC)
    if now.tzinfo is None:
        now = now.replace(tzinfo=UTC)
    day = now.astimezone(UTC).date()
    return datetime.combine(day, time.min, tzinfo=UTC)


@strawberry.type
class PosOrdersQuery:
    @strawberry.field(description="Load a single POS ticket by id.")
    def pos_order(self, info: strawberry.Info, id: int) -> PosOrderType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            order = pos_svc.get_order(session, id)
            if order is None:
                return None
            if not is_location_owner(session, order.location_id, user_id, info=info):
                return None
            return pos_order_to_gql(order)

    @strawberry.field(
        description=(
            "List POS tickets for a location. Defaults to tickets opened since "
            "start of the current UTC day."
        )
    )
    def pos_orders(
        self,
        info: strawberry.Info,
        location_id: int,
        status: PosOrderStatus | None = None,
        since: datetime | None = None,
    ) -> list[PosOrderType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            loc = session.get(Location, location_id)
            if loc is None:
                return []
            if not is_location_owner(session, location_id, user_id, info=info):
                return []
            since_dt = since if since is not None else _start_of_utc_day()
            status_value = status.value if status is not None else None
            orders = pos_svc.list_orders(
                session,
                location_id,
                status=status_value,
                since=since_dt,
            )
            return [pos_order_to_gql(order) for order in orders]
