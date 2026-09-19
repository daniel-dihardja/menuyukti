"""GraphQL queries for native POS tickets."""

from __future__ import annotations

from datetime import UTC, date, datetime, time

import strawberry

import graphql.services.pos_orders as pos_svc
from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.mappers.pos_order import pos_order_to_gql
from graphql.schema.types.pos_order import (
    PosDayPaymentTotalType,
    PosDaySummaryType,
    PosOrderStatus,
    PosOrderType,
    PosPaymentMethod,
)


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

    @strawberry.field(description="Day close / Z-lite summary for native POS tickets.")
    def pos_day_summary(
        self,
        info: strawberry.Info,
        location_id: int,
        on_date: str | None = None,
    ) -> PosDaySummaryType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            loc = session.get(Location, location_id)
            if loc is None:
                return None
            if not is_location_owner(session, location_id, user_id, info=info):
                return None
            day = date.fromisoformat(on_date) if on_date else datetime.now(UTC).date()
            summary = pos_svc.day_summary(session, location_id=location_id, on_date=day)
            paid = [
                PosDayPaymentTotalType(
                    payment_method=PosPaymentMethod(row["payment_method"]),
                    ticket_count=int(row["ticket_count"]),
                    gross_total=float(row["gross_total"]),
                )
                for row in summary["paid_by_payment_method"]  # type: ignore[index]
            ]
            return PosDaySummaryType(
                location_id=int(summary["location_id"]),  # type: ignore[arg-type]
                on_date=str(summary["on_date"]),
                open_count=int(summary["open_count"]),  # type: ignore[arg-type]
                paid_count=int(summary["paid_count"]),  # type: ignore[arg-type]
                void_count=int(summary["void_count"]),  # type: ignore[arg-type]
                refunded_count=int(summary["refunded_count"]),  # type: ignore[arg-type]
                paid_discount_total=float(summary["paid_discount_total"]),  # type: ignore[arg-type]
                paid_by_payment_method=paid,
                refunded_gross_total=float(summary["refunded_gross_total"]),  # type: ignore[arg-type]
                open_tickets_remaining=int(summary["open_tickets_remaining"]),  # type: ignore[arg-type]
            )
