"""ORM → GraphQL mappers for native POS tickets."""

from __future__ import annotations

import json

from graphql.data_sources.models.pos_audit_event import PosAuditEvent
from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine, PosOrderLineModifier
from graphql.schema.types.pos_order import (
    PosAuditEventType,
    PosFiscalProcessType,
    PosFulfillmentMode,
    PosOrderLineModifierType,
    PosOrderLineType,
    PosOrderStatus,
    PosOrderType,
    PosPaymentMethod,
    PosPrepStatus,
    PosTaxBreakdownType,
    PublicMenuOrderLineGuestType,
    PublicMenuOrderStatusType,
)
from graphql.services.pos_money import cents_to_euros
from graphql.services.pos_orders import order_tax_breakdown


def pos_fiscal_process_to_gql(row: PosFiscalProcess) -> PosFiscalProcessType:
    return PosFiscalProcessType(
        id=row.id,
        kind=row.kind,
        state=row.state,
        provider=row.provider,
        tse_transaction_id=row.tse_transaction_id,
        tse_signature=row.tse_signature,
        signature_counter=row.signature_counter,
        certificate_serial=row.certificate_serial,
        client_id=row.client_id,
        qr_payload=row.qr_payload,
        process_type=row.process_type,
        started_at=row.started_at,
        finished_at=row.finished_at,
        last_error=row.last_error,
    )


def pos_order_line_modifier_to_gql(row: PosOrderLineModifier) -> PosOrderLineModifierType:
    return PosOrderLineModifierType(
        id=row.id,
        pos_order_line_id=row.pos_order_line_id,
        group_name_snapshot=row.group_name_snapshot,
        name_snapshot=row.name_snapshot,
        price_delta_snapshot=cents_to_euros(int(row.price_delta_cents or 0)),
        sort_order=row.sort_order,
    )


def pos_order_line_to_gql(row: PosOrderLine) -> PosOrderLineType:
    modifiers = sorted(row.modifiers, key=lambda m: (m.sort_order, m.id))
    return PosOrderLineType(
        id=row.id,
        pos_order_id=row.pos_order_id,
        menu_item_id=row.menu_item_id,
        name_snapshot=row.name_snapshot,
        menu_category_snapshot=row.menu_category_snapshot,
        menu_category_detail_snapshot=row.menu_category_detail_snapshot,
        qty=row.qty,
        unit_price=cents_to_euros(int(row.unit_price_cents)),
        line_total=cents_to_euros(int(row.gross_cents)),
        tax_class=row.tax_class_snapshot,
        tax_rate_bps=int(row.tax_rate_bps_snapshot),
        net=cents_to_euros(int(row.net_cents)),
        tax=cents_to_euros(int(row.tax_cents)),
        note=row.note,
        sort_order=row.sort_order,
        modifiers=[pos_order_line_modifier_to_gql(m) for m in modifiers],
    )


def pos_order_to_gql(row: PosOrder) -> PosOrderType:
    lines = sorted(row.lines, key=lambda line: (line.sort_order, line.id))
    payment: PosPaymentMethod | None = None
    if row.payment_method:
        payment = PosPaymentMethod(row.payment_method)
    fulfillment: PosFulfillmentMode | None = None
    if row.fulfillment_mode:
        fulfillment = PosFulfillmentMode(row.fulfillment_mode)
    prep: PosPrepStatus | None = None
    if row.prep_status:
        prep = PosPrepStatus(row.prep_status)
    breakdown = [
        PosTaxBreakdownType(
            tax_rate_bps=int(b["tax_rate_bps"]),
            net=float(b["net"]),
            tax=float(b["tax"]),
            gross=float(b["gross"]),
        )
        for b in order_tax_breakdown(row)
    ]
    fiscal_rows = sorted(
        getattr(row, "fiscal_processes", None) or [],
        key=lambda p: p.id,
    )
    return PosOrderType(
        id=row.id,
        location_id=row.location_id,
        register_id=row.register_id,
        bill_number=row.bill_number,
        status=PosOrderStatus(row.status),
        opened_at=row.opened_at,
        closed_at=row.closed_at,
        opened_by_clerk_user_id=row.opened_by_clerk_user_id,
        payment_method=payment,
        discount_amount=cents_to_euros(int(row.discount_cents or 0)),
        net=cents_to_euros(int(row.net_cents or 0)),
        tax=cents_to_euros(int(row.tax_cents or 0)),
        gross=cents_to_euros(int(row.gross_cents or 0)),
        tax_breakdown=breakdown,
        table_label=row.table_label,
        fulfillment_mode=fulfillment,
        prep_status=prep,
        delivery_address=row.delivery_address,
        delivery_phone=row.delivery_phone,
        delivery_notes=row.delivery_notes,
        note=row.note,
        refunded_at=row.refunded_at,
        fiscal_processes=[pos_fiscal_process_to_gql(p) for p in fiscal_rows],
        lines=[pos_order_line_to_gql(line) for line in lines],
    )


def public_menu_order_status_to_gql(
    row: PosOrder,
    *,
    include_lines: bool = False,
) -> PublicMenuOrderStatusType:
    fulfillment: PosFulfillmentMode | None = None
    if row.fulfillment_mode:
        fulfillment = PosFulfillmentMode(row.fulfillment_mode)
    prep: PosPrepStatus | None = None
    if row.prep_status:
        prep = PosPrepStatus(row.prep_status)
    lines: list[PublicMenuOrderLineGuestType] = []
    if include_lines:
        lines = [
            PublicMenuOrderLineGuestType(
                menu_item_id=int(line.menu_item_id),
                name=str(line.name_snapshot or "").strip() or f"Item {line.menu_item_id}",
            )
            for line in row.lines
        ]
    return PublicMenuOrderStatusType(
        id=row.id,
        bill_number=row.bill_number,
        status=PosOrderStatus(row.status),
        prep_status=prep,
        fulfillment_mode=fulfillment,
        table_label=row.table_label,
        delivery_address=row.delivery_address,
        delivery_phone=row.delivery_phone,
        delivery_notes=row.delivery_notes,
        lines=lines,
    )


def pos_audit_event_to_gql(row: PosAuditEvent) -> PosAuditEventType:
    return PosAuditEventType(
        id=row.id,
        location_id=row.location_id,
        pos_order_id=row.pos_order_id,
        actor_clerk_user_id=row.actor_clerk_user_id,
        action=row.action,
        payload_json=json.dumps(row.payload or {}),
        created_at=row.created_at,
    )
