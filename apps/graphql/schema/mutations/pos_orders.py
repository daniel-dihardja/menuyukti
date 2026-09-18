"""GraphQL mutations for native POS ticket lifecycle."""

from __future__ import annotations

import strawberry

import graphql.services.pos_orders as pos_svc
from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mappers.pos_order import pos_order_to_gql
from graphql.schema.types.pos_order import PosOrderType, PosPaymentMethod


def _load_owned_order(session, order_id: int, user_id: str, info: strawberry.Info):
    order = pos_svc.get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    require_location_owner(session, order.location_id, user_id, info=info)
    return order


@strawberry.type
class PosOrderMutations:
    @strawberry.mutation(description="Open a new POS ticket for a location.")
    def open_pos_order(
        self,
        info: strawberry.Info,
        location_id: int,
        table_label: str | None = None,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for openPosOrder")
        with request_session_scope(info) as session:
            loc = session.get(Location, location_id)
            if loc is None:
                raise ValueError("Location not found")
            require_location_owner(session, location_id, user_id, info=info)
            order = pos_svc.open_order(
                session,
                location_id=location_id,
                clerk_user_id=user_id,
                table_label=table_label,
            )
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(description="Add a menu item line to an open POS ticket.")
    def add_pos_order_line(
        self,
        info: strawberry.Info,
        order_id: int,
        menu_item_id: int,
        qty: int = 1,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for addPosOrderLine")
        with request_session_scope(info) as session:
            _load_owned_order(session, order_id, user_id, info)
            order = pos_svc.add_line(session, order_id=order_id, menu_item_id=menu_item_id, qty=qty)
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(description="Update quantity on an open POS ticket line.")
    def update_pos_order_line(
        self,
        info: strawberry.Info,
        line_id: int,
        qty: int,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updatePosOrderLine")
        with request_session_scope(info) as session:
            from graphql.data_sources.models.pos_order import PosOrderLine

            line = session.get(PosOrderLine, line_id)
            if line is None:
                raise ValueError("Order line not found")
            _load_owned_order(session, line.pos_order_id, user_id, info)
            order = pos_svc.update_line_qty(session, line_id=line_id, qty=qty)
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(description="Remove a line from an open POS ticket.")
    def remove_pos_order_line(self, info: strawberry.Info, line_id: int) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for removePosOrderLine")
        with request_session_scope(info) as session:
            from graphql.data_sources.models.pos_order import PosOrderLine

            line = session.get(PosOrderLine, line_id)
            if line is None:
                raise ValueError("Order line not found")
            _load_owned_order(session, line.pos_order_id, user_id, info)
            order = pos_svc.remove_line(session, line_id=line_id)
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(description="Set bill-level discount on an open POS ticket.")
    def set_pos_order_discount(
        self,
        info: strawberry.Info,
        order_id: int,
        amount: float,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for setPosOrderDiscount")
        with request_session_scope(info) as session:
            _load_owned_order(session, order_id, user_id, info)
            order = pos_svc.set_discount(session, order_id=order_id, amount=amount)
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(
        description=(
            "Set or clear the optional table label on an open POS ticket. "
            "Pass null or blank to clear."
        )
    )
    def set_pos_order_table_label(
        self,
        info: strawberry.Info,
        order_id: int,
        table_label: str | None = None,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for setPosOrderTableLabel")
        with request_session_scope(info) as session:
            _load_owned_order(session, order_id, user_id, info)
            order = pos_svc.set_table_label(session, order_id=order_id, label=table_label)
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(
        description=(
            "Close (pay) an open POS ticket and project OrderFact rows onto the "
            "monthly Menuyukti POS analytics run."
        )
    )
    def close_pos_order(
        self,
        info: strawberry.Info,
        order_id: int,
        payment_method: PosPaymentMethod,
    ) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for closePosOrder")
        with request_session_scope(info) as session:
            _load_owned_order(session, order_id, user_id, info)
            order = pos_svc.close_order(
                session,
                order_id=order_id,
                payment_method=payment_method.value,
            )
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)

    @strawberry.mutation(description="Void an open POS ticket (no OrderFact projection).")
    def void_pos_order(self, info: strawberry.Info, order_id: int) -> PosOrderType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for voidPosOrder")
        with request_session_scope(info) as session:
            _load_owned_order(session, order_id, user_id, info)
            order = pos_svc.void_order(session, order_id=order_id)
            session.commit()
            refreshed = pos_svc.get_order(session, order.id)
            return pos_order_to_gql(refreshed or order)
