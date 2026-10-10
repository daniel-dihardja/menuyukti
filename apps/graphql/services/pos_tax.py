"""VAT helpers for native POS (brutto prices, basis-point rates)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.data_sources.models.tax_rate import TaxRate

TAX_CLASS_STANDARD = "standard"
TAX_CLASS_REDUCED = "reduced"
KNOWN_TAX_CLASSES = frozenset({TAX_CLASS_STANDARD, TAX_CLASS_REDUCED})

# Fallback when tax_rate rows are missing (e.g. fresh SQLite test DB).
_DEFAULT_RATES_BPS: dict[str, int] = {
    TAX_CLASS_STANDARD: 1900,
    TAX_CLASS_REDUCED: 700,
}


def ensure_default_tax_rates(session: Session) -> None:
    """Insert standard/reduced rates if the table is empty."""
    existing = session.scalar(select(TaxRate.id).limit(1))
    if existing is not None:
        return
    session.add(
        TaxRate(code=TAX_CLASS_STANDARD, rate_bps=1900, valid_from=date(2020, 1, 1), valid_to=None)
    )
    session.add(
        TaxRate(code=TAX_CLASS_REDUCED, rate_bps=700, valid_from=date(2020, 1, 1), valid_to=None)
    )
    session.flush()


def normalize_tax_class(tax_class: str | None) -> str:
    code = (tax_class or TAX_CLASS_STANDARD).strip().lower()
    if code not in KNOWN_TAX_CLASSES:
        raise ValueError(f"Unknown tax_class: {tax_class!r}")
    return code


def resolve_tax_rate_bps(session: Session, *, tax_class: str, on_date: date) -> int:
    """Return rate in basis points for tax_class effective on on_date."""
    ensure_default_tax_rates(session)
    code = normalize_tax_class(tax_class)
    rows = list(
        session.execute(
            select(TaxRate)
            .where(TaxRate.code == code, TaxRate.valid_from <= on_date)
            .order_by(TaxRate.valid_from.desc())
        )
        .scalars()
        .all()
    )
    for row in rows:
        if row.valid_to is None or row.valid_to >= on_date:
            return int(row.rate_bps)
    return _DEFAULT_RATES_BPS[code]


def split_gross_cents(gross_cents: int, rate_bps: int) -> tuple[int, int]:
    """Split brutto cents into (net_cents, tax_cents). Tax = gross − net."""
    if gross_cents < 0:
        raise ValueError("gross_cents must be >= 0")
    if rate_bps < 0:
        raise ValueError("rate_bps must be >= 0")
    if gross_cents == 0:
        return 0, 0
    divisor = Decimal(10000 + rate_bps)
    net = int(
        (Decimal(gross_cents) * Decimal(10000) / divisor).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )
    tax = gross_cents - net
    return net, tax


@dataclass(frozen=True)
class AllocatedLineTax:
    line_id: int
    gross_cents: int
    net_cents: int
    tax_cents: int
    tax_rate_bps: int


def allocate_discount_and_tax(
    lines: Sequence[PosOrderLine],
    discount_cents: int,
) -> list[AllocatedLineTax]:
    """Pro-rate bill discount on pre-discount gross, then re-split VAT per line."""
    if not lines:
        raise ValueError("Order has no lines")
    if discount_cents < 0:
        raise ValueError("discount_cents must be >= 0")

    pre_gross = [int(line.unit_price_cents) * int(line.qty) for line in lines]
    subtotal = sum(pre_gross)
    if subtotal <= 0:
        raise ValueError("Order subtotal must be positive")
    if discount_cents >= subtotal:
        raise ValueError("discount_cents must leave every line with positive revenue")

    if discount_cents == 0:
        allocated_gross = pre_gross
    else:
        # Largest-remainder allocation in cents
        raw = [
            Decimal(g) - (Decimal(discount_cents) * Decimal(g) / Decimal(subtotal))
            for g in pre_gross
        ]
        floored = [int(v.to_integral_value(rounding=ROUND_HALF_UP)) for v in raw]
        target = subtotal - discount_cents
        drift = target - sum(floored)
        if floored:
            floored[-1] += drift
        allocated_gross = floored

    if any(g <= 0 for g in allocated_gross):
        raise ValueError("discount_cents must leave every line with positive revenue")

    result: list[AllocatedLineTax] = []
    for line, gross in zip(lines, allocated_gross, strict=True):
        rate = int(line.tax_rate_bps_snapshot)
        net, tax = split_gross_cents(gross, rate)
        result.append(
            AllocatedLineTax(
                line_id=line.id,
                gross_cents=gross,
                net_cents=net,
                tax_cents=tax,
                tax_rate_bps=rate,
            )
        )
    return result


def apply_line_tax_allocation(order: PosOrder, allocations: Sequence[AllocatedLineTax]) -> None:
    """Write allocated net/tax/gross onto lines and order totals."""
    by_id = {a.line_id: a for a in allocations}
    for line in order.lines:
        alloc = by_id[line.id]
        line.gross_cents = alloc.gross_cents
        line.net_cents = alloc.net_cents
        line.tax_cents = alloc.tax_cents
    order.gross_cents = sum(a.gross_cents for a in allocations)
    order.net_cents = sum(a.net_cents for a in allocations)
    order.tax_cents = sum(a.tax_cents for a in allocations)


def recompute_order_tax(order: PosOrder) -> None:
    """Recompute line + order tax fields from current qty/unit/discount."""
    if not order.lines:
        order.net_cents = 0
        order.tax_cents = 0
        order.gross_cents = 0
        return
    allocations = allocate_discount_and_tax(order.lines, int(order.discount_cents or 0))
    apply_line_tax_allocation(order, allocations)


def tax_breakdown_by_rate(order: PosOrder) -> list[dict[str, int]]:
    """Aggregate net/tax/gross by tax_rate_bps for receipts."""
    buckets: dict[int, dict[str, int]] = {}
    for line in order.lines:
        rate = int(line.tax_rate_bps_snapshot)
        bucket = buckets.setdefault(rate, {"tax_rate_bps": rate, "net_cents": 0, "tax_cents": 0, "gross_cents": 0})
        bucket["net_cents"] += int(line.net_cents)
        bucket["tax_cents"] += int(line.tax_cents)
        bucket["gross_cents"] += int(line.gross_cents)
    return sorted(buckets.values(), key=lambda b: b["tax_rate_bps"])
