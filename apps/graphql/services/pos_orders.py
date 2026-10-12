"""Native POS ticket lifecycle and OrderFact projection.

Public API barrel — implementation lives in focused sibling modules.
"""

from __future__ import annotations

from graphql.services.pos_order_close import (
    allocate_line_revenues,
    close_order,
    get_or_create_monthly_pos_run,
    refund_order,
)
from graphql.services.pos_order_constants import (
    DEFAULT_REGISTER_CODE,
    DEFAULT_REGISTER_LABEL,
    LINE_NOTE_MAX_LEN,
    PAYMENT_METHODS,
    POS_STATUS_OPEN,
    POS_STATUS_PAID,
    POS_STATUS_REFUNDED,
    POS_STATUS_VOID,
    POS_SYSTEM,
    PUBLIC_MENU_ORDER_NOTE,
    TABLE_LABEL_MAX_LEN,
    normalize_line_note,
    normalize_table_label,
)
from graphql.services.pos_order_lifecycle import (
    add_line,
    advance_pos_order_prep_status,
    open_order,
    remove_line,
    set_discount,
    set_line_note,
    set_table_label,
    submit_public_menu_order,
    update_line_qty,
    void_order,
)
from graphql.services.pos_order_reads import (
    day_summary,
    get_order,
    list_orders,
    order_gross_total,
    order_tax_breakdown,
)
from graphql.services.pos_register_bill import ensure_default_register, next_bill_number

__all__ = [
    "DEFAULT_REGISTER_CODE",
    "DEFAULT_REGISTER_LABEL",
    "LINE_NOTE_MAX_LEN",
    "PAYMENT_METHODS",
    "POS_STATUS_OPEN",
    "POS_STATUS_PAID",
    "POS_STATUS_REFUNDED",
    "POS_STATUS_VOID",
    "POS_SYSTEM",
    "PUBLIC_MENU_ORDER_NOTE",
    "TABLE_LABEL_MAX_LEN",
    "add_line",
    "advance_pos_order_prep_status",
    "allocate_line_revenues",
    "close_order",
    "day_summary",
    "ensure_default_register",
    "get_or_create_monthly_pos_run",
    "get_order",
    "list_orders",
    "next_bill_number",
    "normalize_line_note",
    "normalize_table_label",
    "open_order",
    "order_gross_total",
    "order_tax_breakdown",
    "refund_order",
    "remove_line",
    "set_discount",
    "set_line_note",
    "set_table_label",
    "submit_public_menu_order",
    "update_line_qty",
    "void_order",
]
