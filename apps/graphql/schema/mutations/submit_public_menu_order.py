"""Guest mutation: submit an open POS ticket from the public digital menu."""

from __future__ import annotations

import strawberry

import graphql.services.pos_orders as pos_svc
from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.pos_order import pos_order_to_gql
from graphql.schema.types.pos_order import PosOrderType


@strawberry.input(description="One line on a guest digital-menu order.")
class PublicMenuOrderLineInput:
    menu_item_id: int
    qty: int = 1


@strawberry.type
class SubmitPublicMenuOrderMutation:
    @strawberry.mutation(
        description=(
            "Authenticated guest: open a POS ticket for a published digital menu "
            "and add lines. No location ownership required. Close/pay remains staff-only."
        )
    )
    def submit_public_menu_order(
        self,
        info: strawberry.Info,
        location_id: int,
        lines: list[PublicMenuOrderLineInput],
        table_label: str | None = None,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for submitPublicMenuOrder")
        with request_session_scope(info) as session:
            loc = session.get(Location, location_id)
            if loc is None:
                raise ValueError("Location not found")
            order = pos_svc.submit_public_menu_order(
                session,
                location_id=location_id,
                clerk_user_id=user_id,
                lines=[(line.menu_item_id, line.qty) for line in lines],
                table_label=table_label,
            )
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)
