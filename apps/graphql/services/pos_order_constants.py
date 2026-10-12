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
