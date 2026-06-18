"""
Registry of POS normalizer functions.

HOW TO ADD A NEW POS SYSTEM:
============================
1. Add POS config to menuyukti/core/models/pos_mapping.py

2. Add normalizer function and register it in NORMALIZERS below.

That's it! Your POS is then auto-detected (via POS_CONFIG) and normalized.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from menuyukti.core.analytics.esb.normalizer import normalize_esb_excel
from menuyukti.core.analytics.quino.normalizer import normalize_quino_excel

Normalizer = Callable[..., Any]

NORMALIZERS: dict[str, Normalizer] = {
    "esb": normalize_esb_excel,
    "quino": normalize_quino_excel,
}


def get_normalizer(pos_key: str) -> Normalizer | None:
    """Return the normalizer for a POS key, or None if unsupported."""
    return NORMALIZERS.get(pos_key)
