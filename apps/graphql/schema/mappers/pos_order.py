"""ORM → GraphQL mappers for native POS tickets."""

from __future__ import annotations

from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.schema.types.pos_order import (
    PosOrderLineType,
    PosOrderStatus,
    PosOrderType,
    PosPaymentMethod,
)


def pos_order_line_to_gql(row: PosOrderLine) -> PosOrderLineType:
    return PosOrderLineType(
        id=row.id,
        pos_order_id=row.pos_order_id,
        menu_item_id=row.menu_item_id,
        name_snapshot=row.name_snapshot,
        menu_category_snapshot=row.menu_category_snapshot,
        menu_category_detail_snapshot=row.menu_category_detail_snapshot,
        qty=row.qty,
        unit_price=row.unit_price,
        line_total=row.line_total,
        sort_order=row.sort_order,
    )


def pos_order_to_gql(row: PosOrder) -> PosOrderType:
    lines = sorted(row.lines, key=lambda line: (line.sort_order, line.id))
    payment: PosPaymentMethod | None = None
    if row.payment_method:
        payment = PosPaymentMethod(row.payment_method)
    return PosOrderType(
        id=row.id,
        location_id=row.location_id,
        bill_number=row.bill_number,
        status=PosOrderStatus(row.status),
        opened_at=row.opened_at,
        closed_at=row.closed_at,
        opened_by_clerk_user_id=row.opened_by_clerk_user_id,
        payment_method=payment,
        discount_amount=float(row.discount_amount or 0),
        table_label=row.table_label,
        note=row.note,
        refunded_at=row.refunded_at,
        lines=[pos_order_line_to_gql(line) for line in lines],
    )
