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


@strawberry.type(description="Selected modifier snapshot on a POS line.")
class PosOrderLineModifierType:
    id: int
    pos_order_line_id: int
    group_name_snapshot: str
    name_snapshot: str
    price_delta_snapshot: float
    sort_order: int


@strawberry.type(description="One line on a POS ticket with price/name snapshots.")
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
    note: str | None
    sort_order: int
    modifiers: list[PosOrderLineModifierType]


@strawberry.type(description="Native POS ticket (operational truth).")
class PosOrderType:
    id: int
    location_id: int
    bill_number: str
    status: PosOrderStatus
    opened_at: datetime
    closed_at: datetime | None
    opened_by_clerk_user_id: str
    payment_method: PosPaymentMethod | None
    discount_amount: float
    table_label: str | None
    note: str | None
    refunded_at: datetime | None
    lines: list[PosOrderLineType]


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
