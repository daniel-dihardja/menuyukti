"""POS money helpers: integer cents ↔ euro floats for GraphQL."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def euros_to_cents(amount: float) -> int:
    """Convert a euro float to integer cents (half-up)."""
    return int(Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) * 100)


def cents_to_euros(cents: int) -> float:
    """Convert integer cents to a 2-decimal euro float."""
    return float(Decimal(cents) / Decimal(100))
