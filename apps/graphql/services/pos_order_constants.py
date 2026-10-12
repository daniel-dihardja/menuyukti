"""Shared POS ticket constants and pure validators."""

from __future__ import annotations

POS_SYSTEM = "menuyukti"
POS_STATUS_OPEN = "open"
POS_STATUS_PAID = "paid"
POS_STATUS_VOID = "void"
POS_STATUS_REFUNDED = "refunded"
PAYMENT_METHODS = frozenset({"cash", "card", "other"})
TABLE_LABEL_MAX_LEN = 64
LINE_NOTE_MAX_LEN = 256
DEFAULT_REGISTER_CODE = "DEFAULT"
DEFAULT_REGISTER_LABEL = "Register 1"
PUBLIC_MENU_ORDER_NOTE = "digital_menu"
FULFILLMENT_DINE_IN = "dine_in"
FULFILLMENT_PICKUP = "pickup"
FULFILLMENT_MODES = frozenset({FULFILLMENT_DINE_IN, FULFILLMENT_PICKUP})
PREP_RECEIVED = "received"
PREP_PREPARING = "preparing"
PREP_READY = "ready"
PREP_SERVED = "served"
PREP_PICKED_UP = "picked_up"
PREP_STATUSES = frozenset({PREP_RECEIVED, PREP_PREPARING, PREP_READY, PREP_SERVED, PREP_PICKED_UP})
PREP_TERMINAL = frozenset({PREP_SERVED, PREP_PICKED_UP})


def validate_menu_fulfillment_allows(*, allow_dine_in: bool, allow_pickup: bool) -> None:
    """Require at least one digital-menu fulfillment mode enabled."""
    if not allow_dine_in and not allow_pickup:
        raise ValueError("At least one of allow_dine_in or allow_pickup must be true")


def normalize_fulfillment_mode(mode: str) -> str:
    """Require dine_in or pickup; raise ValueError otherwise."""
    cleaned = (mode or "").strip().lower()
    if cleaned not in FULFILLMENT_MODES:
        raise ValueError(f"fulfillment_mode must be one of: {', '.join(sorted(FULFILLMENT_MODES))}")
    return cleaned


def normalize_prep_status(status: str) -> str:
    """Require a known prep_status value; raise ValueError otherwise."""
    cleaned = (status or "").strip().lower()
    if cleaned not in PREP_STATUSES:
        raise ValueError(f"prep_status must be one of: {', '.join(sorted(PREP_STATUSES))}")
    return cleaned


def next_prep_status(current: str | None, fulfillment_mode: str | None) -> str:
    """Return the next forward prep status for a digital-menu ticket."""
    mode = normalize_fulfillment_mode(fulfillment_mode or "")
    if current is None:
        raise ValueError("prep_status is not set on this order")
    current_norm = normalize_prep_status(current)
    if current_norm in PREP_TERMINAL:
        raise ValueError(f"prep_status is already terminal ({current_norm})")
    if current_norm == PREP_RECEIVED:
        return PREP_PREPARING
    if current_norm == PREP_PREPARING:
        return PREP_READY
    if current_norm == PREP_READY:
        return PREP_SERVED if mode == FULFILLMENT_DINE_IN else PREP_PICKED_UP
    raise ValueError(f"Cannot advance prep_status from {current_norm}")


def normalize_table_label(label: str | None) -> str | None:
    """Trim and empty→None; raise if longer than TABLE_LABEL_MAX_LEN."""
    if label is None:
        return None
    cleaned = label.strip()
    if not cleaned:
        return None
    if len(cleaned) > TABLE_LABEL_MAX_LEN:
        raise ValueError(f"table_label must be at most {TABLE_LABEL_MAX_LEN} characters")
    return cleaned


def normalize_line_note(note: str | None) -> str | None:
    if note is None:
        return None
    cleaned = note.strip()
    if not cleaned:
        return None
    if len(cleaned) > LINE_NOTE_MAX_LEN:
        raise ValueError(f"line note must be at most {LINE_NOTE_MAX_LEN} characters")
    return cleaned
