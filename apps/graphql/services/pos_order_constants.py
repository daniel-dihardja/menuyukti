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


def validate_menu_fulfillment_allows(*, allow_dine_in: bool, allow_pickup: bool) -> None:
    """Require at least one digital-menu fulfillment mode enabled."""
    if not allow_dine_in and not allow_pickup:
        raise ValueError("At least one of allow_dine_in or allow_pickup must be true")


def normalize_fulfillment_mode(mode: str) -> str:
    """Require dine_in or pickup; raise ValueError otherwise."""
    cleaned = (mode or "").strip().lower()
    if cleaned not in FULFILLMENT_MODES:
        raise ValueError(
            f"fulfillment_mode must be one of: {', '.join(sorted(FULFILLMENT_MODES))}"
        )
    return cleaned


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
