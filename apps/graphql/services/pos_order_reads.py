"""POS ticket loads, day summary, and display helpers."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.services.pos_money import cents_to_euros
from graphql.services.pos_order_constants import (
    PAYMENT_METHODS,
    POS_STATUS_OPEN,
    POS_STATUS_PAID,
    POS_STATUS_REFUNDED,
    POS_STATUS_VOID,
    PUBLIC_MENU_ORDER_NOTE,
)
from graphql.services.pos_tax import tax_breakdown_by_rate
from graphql.services.pos_time import is_on_berlin_day, start_of_berlin_day


def _order_load_options():
    return (
        selectinload(PosOrder.lines).selectinload(PosOrderLine.modifiers),
        selectinload(PosOrder.fiscal_processes),
    )


def get_order(session: Session, order_id: int) -> PosOrder | None:
    return (
        session.execute(
            select(PosOrder)
            .options(*_order_load_options())
            .where(PosOrder.id == order_id)
            .execution_options(populate_existing=True)
        )
        .unique()
        .scalar_one_or_none()
    )


def get_open_public_menu_order_for_guest(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str,
) -> PosOrder | None:
    """Latest open digital-menu ticket opened by this guest at the location."""
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        return None
    return (
        session.execute(
            select(PosOrder)
            .options(*_order_load_options())
            .where(
                PosOrder.location_id == location_id,
                PosOrder.opened_by_clerk_user_id == user_id,
                PosOrder.note == PUBLIC_MENU_ORDER_NOTE,
                PosOrder.status == POS_STATUS_OPEN,
            )
            .order_by(PosOrder.id.desc())
            .limit(1)
        )
        .unique()
        .scalar_one_or_none()
    )


def list_orders(
    session: Session,
    location_id: int,
    *,
    status: str | None = None,
    since: datetime | None = None,
) -> list[PosOrder]:
    stmt = (
        select(PosOrder)
        .options(*_order_load_options())
        .where(PosOrder.location_id == location_id)
        .order_by(PosOrder.opened_at.desc())
    )
    if status is not None:
        stmt = stmt.where(PosOrder.status == status)
    if since is not None:
        stmt = stmt.where(PosOrder.opened_at >= since)
    return list(session.execute(stmt).unique().scalars().all())


def order_gross_total(order: PosOrder) -> float:
    return cents_to_euros(int(order.gross_cents or 0))


def order_tax_breakdown(order: PosOrder) -> list[dict[str, Any]]:
    rows = tax_breakdown_by_rate(order)
    return [
        {
            "tax_rate_bps": row["tax_rate_bps"],
            "net": cents_to_euros(row["net_cents"]),
            "tax": cents_to_euros(row["tax_cents"]),
            "gross": cents_to_euros(row["gross_cents"]),
        }
        for row in rows
    ]


def day_summary(
    session: Session,
    *,
    location_id: int,
    on_date: date,
) -> dict[str, object]:
    """Aggregate POS ticket stats for a Europe/Berlin calendar day."""
    # Include previous Berlin day so overnight open→close tickets are visible.
    since = start_of_berlin_day(on_date - timedelta(days=1))
    orders = list_orders(session, location_id, since=since)

    open_count = 0
    paid_count = 0
    void_count = 0
    refunded_count = 0
    paid_discount_total = 0.0
    refunded_gross_total = 0.0
    by_method: dict[str, dict[str, float | int]] = {
        method: {"ticket_count": 0, "gross_total": 0.0} for method in sorted(PAYMENT_METHODS)
    }

    for order in orders:
        if order.status == POS_STATUS_OPEN:
            if is_on_berlin_day(order.opened_at, on_date):
                open_count += 1
            continue
        if order.status == POS_STATUS_VOID:
            closed = order.closed_at or order.opened_at
            if is_on_berlin_day(closed, on_date):
                void_count += 1
            continue
        if order.status == POS_STATUS_REFUNDED:
            when = order.refunded_at or order.closed_at or order.opened_at
            if is_on_berlin_day(when, on_date):
                refunded_count += 1
                refunded_gross_total += order_gross_total(order)
            continue
        if order.status == POS_STATUS_PAID:
            closed = order.closed_at or order.opened_at
            if not is_on_berlin_day(closed, on_date):
                continue
            paid_count += 1
            paid_discount_total += cents_to_euros(int(order.discount_cents or 0))
            method = order.payment_method or "other"
            if method not in by_method:
                by_method[method] = {"ticket_count": 0, "gross_total": 0.0}
            by_method[method]["ticket_count"] = int(by_method[method]["ticket_count"]) + 1
            by_method[method]["gross_total"] = float(by_method[method]["gross_total"]) + (
                order_gross_total(order)
            )

    open_remaining = len(list_orders(session, location_id, status=POS_STATUS_OPEN))

    return {
        "location_id": location_id,
        "on_date": on_date.isoformat(),
        "open_count": open_count,
        "paid_count": paid_count,
        "void_count": void_count,
        "refunded_count": refunded_count,
        "paid_discount_total": round(paid_discount_total, 2),
        "paid_by_payment_method": [
            {
                "payment_method": method,
                "ticket_count": int(stats["ticket_count"]),
                "gross_total": round(float(stats["gross_total"]), 2),
            }
            for method, stats in by_method.items()
            if int(stats["ticket_count"]) > 0
        ],
        "refunded_gross_total": round(refunded_gross_total, 2),
        "open_tickets_remaining": open_remaining,
    }
