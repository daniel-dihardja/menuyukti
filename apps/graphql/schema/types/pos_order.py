"""GraphQL types for native POS tickets."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

import strawberry


@strawberry.enum(description="Lifecycle status of a POS ticket.")
class PosOrderStatus(Enum):
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    REFUNDED = "refunded"


@strawberry.enum(description="Recorded payment method on close (no processor in v1).")
class PosPaymentMethod(Enum):
    CASH = "cash"
    CARD = "card"
    OTHER = "other"


@strawberry.enum(description="How a digital-menu (or similar) ticket should be fulfilled.")
class PosFulfillmentMode(Enum):
    DINE_IN = "dine_in"
    PICKUP = "pickup"


@strawberry.enum(description="Kitchen / fulfillment prep status (independent of payment).")
class PosPrepStatus(Enum):
    RECEIVED = "received"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    PICKED_UP = "picked_up"


@strawberry.type(description="Selected modifier snapshot on a POS line.")
class PosOrderLineModifierType:
    id: int
    pos_order_line_id: int
    group_name_snapshot: str
    name_snapshot: str
    price_delta_snapshot: float
    sort_order: int


@strawberry.type(description="VAT breakdown bucket for a POS ticket (euros).")
class PosTaxBreakdownType:
    tax_rate_bps: int
    net: float
    tax: float
    gross: float


@strawberry.type(description="Fiscalization / TSE process snapshot for a POS ticket.")
class PosFiscalProcessType:
    id: int
    kind: str
    state: str
    provider: str
    tse_transaction_id: str | None
    tse_signature: str | None
    signature_counter: int | None
    certificate_serial: str | None
    client_id: str | None
    qr_payload: str | None
    process_type: str
    started_at: datetime | None
    finished_at: datetime | None
    last_error: str | None


@strawberry.type(description="One line on a POS ticket with price/name/tax snapshots.")
class PosOrderLineType:
    id: int
    pos_order_id: int
    menu_item_id: int
    name_snapshot: str
    menu_category_snapshot: str
    menu_category_detail_snapshot: str
    qty: int
    unit_price: float
    line_total: float
    tax_class: str
    tax_rate_bps: int
    net: float
    tax: float
    note: str | None
    sort_order: int
    modifiers: list[PosOrderLineModifierType]


@strawberry.type(description="Native POS ticket (operational truth).")
class PosOrderType:
    id: int
    location_id: int
    register_id: int | None
    bill_number: str
    status: PosOrderStatus
    opened_at: datetime
    closed_at: datetime | None
    opened_by_clerk_user_id: str
    payment_method: PosPaymentMethod | None
    discount_amount: float
    net: float
    tax: float
    gross: float
    tax_breakdown: list[PosTaxBreakdownType]
    table_label: str | None
    fulfillment_mode: PosFulfillmentMode | None
    prep_status: PosPrepStatus | None
    note: str | None
    refunded_at: datetime | None
    fiscal_processes: list[PosFiscalProcessType]
    lines: list[PosOrderLineType]


@strawberry.type(
    description=(
        "Minimal guest-facing digital-menu order status (no lines, fiscal, or money fields)."
    )
)
class PublicMenuOrderStatusType:
    id: int
    bill_number: str
    status: PosOrderStatus
    prep_status: PosPrepStatus | None
    fulfillment_mode: PosFulfillmentMode | None
    table_label: str | None


@strawberry.type(description="Append-only POS audit event.")
class PosAuditEventType:
    id: int
    location_id: int
    pos_order_id: int | None
    actor_clerk_user_id: str
    action: str
    payload_json: str
    created_at: datetime


@strawberry.type(description="Day close / Z-lite summary for native POS.")
class PosDayPaymentTotalType:
    payment_method: PosPaymentMethod
    ticket_count: int
    gross_total: float


@strawberry.type(description="Native POS day summary for a location.")
class PosDaySummaryType:
    location_id: int
    on_date: str
    open_count: int
    paid_count: int
    void_count: int
    refunded_count: int
    paid_discount_total: float
    paid_by_payment_method: list[PosDayPaymentTotalType]
    refunded_gross_total: float
    open_tickets_remaining: int
