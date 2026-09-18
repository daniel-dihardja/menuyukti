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


@strawberry.enum(description="Recorded payment method on close (no processor in v1).")
class PosPaymentMethod(Enum):
    CASH = "cash"
    CARD = "card"
    OTHER = "other"


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
    sort_order: int


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
    note: str | None
    lines: list[PosOrderLineType]
