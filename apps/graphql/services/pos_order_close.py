"""POS pay / refund and OrderFact / AnalyticsRun projection."""

from __future__ import annotations

import calendar
from collections.abc import Sequence
from datetime import UTC, date, datetime

from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.services import pos_fiscalization as fiscal
from graphql.services.pos_audit import record_pos_audit
from graphql.services.pos_money import cents_to_euros, euros_to_cents
from graphql.services.pos_order_constants import (
    PAYMENT_METHODS,
    POS_STATUS_OPEN,
    POS_STATUS_PAID,
    POS_STATUS_REFUNDED,
    POS_SYSTEM,
)
from graphql.services.pos_order_reads import get_order
from graphql.services.pos_tax import allocate_discount_and_tax, recompute_order_tax


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _lock_order(session: Session, order_id: int) -> PosOrder | None:
    """Load and row-lock a POS order (FOR UPDATE)."""
    return session.scalar(select(PosOrder).where(PosOrder.id == order_id).with_for_update())


def allocate_line_revenues(lines: Sequence[PosOrderLine], discount_amount: float) -> list[float]:
    """Legacy helper: pro-rate bill discount; returns euros after discount per line."""
    discount_cents = euros_to_cents(float(discount_amount or 0))
    allocations = allocate_discount_and_tax(lines, discount_cents)
    return [cents_to_euros(a.gross_cents) for a in allocations]


def get_or_create_monthly_pos_run(
    session: Session, *, location_id: int, closed_on: date
) -> AnalyticsRun:
    year, month = closed_on.year, closed_on.month
    period_start = date(year, month, 1)
    period_end = date(year, month, calendar.monthrange(year, month)[1])
    name = f"Menuyukti POS {year:04d}-{month:02d}"

    existing = (
        session.execute(
            select(AnalyticsRun).where(
                AnalyticsRun.location_id == location_id,
                AnalyticsRun.pos_system == POS_SYSTEM,
                AnalyticsRun.period_start == period_start,
                AnalyticsRun.period_end == period_end,
            )
        )
        .scalars()
        .first()
    )
    if existing is not None:
        return existing

    run = AnalyticsRun(
        name=name,
        filename="",
        pos_system=POS_SYSTEM,
        period_start=period_start,
        period_end=period_end,
        location_id=location_id,
    )
    session.add(run)
    session.flush()
    return run


def close_order(
    session: Session,
    *,
    order_id: int,
    payment_method: str,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
    if payment_method not in PAYMENT_METHODS:
        raise ValueError(f"Invalid payment_method: {payment_method}")

    locked = _lock_order(session, order_id)
    if locked is None:
        raise ValueError("Order not found")

    # Idempotent: already paid → return without re-projecting facts
    if locked.status == POS_STATUS_PAID:
        return get_order(session, order_id) or locked
    if locked.status != POS_STATUS_OPEN:
        raise ValueError(f"Order {locked.id} is not open (status={locked.status})")

    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    if not order.lines:
        raise ValueError("Cannot close an empty order")

    recompute_order_tax(order)
    session.flush()

    # Finish fiscalization before projecting analytics facts
    fiscal.finish_sale_process(
        session,
        order,
        payment_method=payment_method,
        actor_clerk_user_id=actor_clerk_user_id,
    )

    closed_at = _utcnow()
    run = get_or_create_monthly_pos_run(
        session,
        location_id=order.location_id,
        closed_on=closed_at.astimezone(UTC).date(),
    )

    mappings: list[dict[str, object]] = []
    for line in order.lines:
        mappings.append(
            {
                "analytics_run_id": run.id,
                "bill_number": order.bill_number,
                "menu": line.name_snapshot,
                "qty": line.qty,
                "price": cents_to_euros(int(line.unit_price_cents)),
                "total_after_bill_discount": cents_to_euros(int(line.gross_cents)),
                "order_time": closed_at,
                "menu_category": line.menu_category_snapshot,
                "menu_category_detail": line.menu_category_detail_snapshot,
                "pos_system": POS_SYSTEM,
            }
        )
    session.execute(insert(OrderFact), mappings)

    order.status = POS_STATUS_PAID
    order.closed_at = closed_at
    order.payment_method = payment_method
    session.flush()

    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="close",
            payload={
                "payment_method": payment_method,
                "gross_cents": order.gross_cents,
                "tax_cents": order.tax_cents,
            },
        )

    from graphql.services.point_ledger import award_for_digital_menu_order_paid

    award_for_digital_menu_order_paid(session, order)

    return get_order(session, order.id) or order


def refund_order(
    session: Session,
    *,
    order_id: int,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
    """Full post-pay refund: insert compensating OrderFacts and mark ticket refunded."""
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    if order.status == POS_STATUS_REFUNDED:
        raise ValueError(f"Order {order.id} is already refunded")
    if order.status != POS_STATUS_PAID:
        raise ValueError(f"Order {order.id} is not paid (status={order.status})")

    fiscal.start_and_finish_refund_process(session, order, actor_clerk_user_id=actor_clerk_user_id)

    originals = list(
        session.execute(
            select(OrderFact).where(
                OrderFact.bill_number == order.bill_number,
                OrderFact.pos_system == POS_SYSTEM,
            )
        )
        .scalars()
        .all()
    )
    # Only compensate positive originals (skip any prior negatives)
    positive = [f for f in originals if float(f.total_after_bill_discount) > 0]
    refunded_at = _utcnow()
    mappings: list[dict[str, object]] = []
    for fact in positive:
        mappings.append(
            {
                "analytics_run_id": fact.analytics_run_id,
                "bill_number": fact.bill_number,
                "menu": fact.menu,
                "qty": -int(fact.qty),
                "price": float(fact.price),
                "total_after_bill_discount": -float(fact.total_after_bill_discount),
                "order_time": refunded_at,
                "menu_category": fact.menu_category,
                "menu_category_detail": fact.menu_category_detail,
                "pos_system": POS_SYSTEM,
            }
        )
    if mappings:
        session.execute(insert(OrderFact), mappings)

    order.status = POS_STATUS_REFUNDED
    order.refunded_at = refunded_at
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="refund",
            payload={
                "bill_number": order.bill_number,
                "compensating_facts": len(mappings),
            },
        )
    return get_order(session, order.id) or order
