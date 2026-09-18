"""Native POS ticket lifecycle and OrderFact projection."""

from __future__ import annotations

import calendar
from collections.abc import Sequence
from datetime import UTC, date, datetime

from sqlalchemy import insert, select
from sqlalchemy.orm import Session, joinedload

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.data_sources.models.menu import Menu, MenuItem
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine

POS_SYSTEM = "menuyukti"
POS_STATUS_OPEN = "open"
POS_STATUS_PAID = "paid"
POS_STATUS_VOID = "void"
PAYMENT_METHODS = frozenset({"cash", "card", "other"})
TABLE_LABEL_MAX_LEN = 64


def _utcnow() -> datetime:
    return datetime.now(UTC)


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


def next_bill_number(session: Session, location_id: int, when: datetime) -> str:
    """Return ``MY-YYYYMMDD-#####`` unique for the location on that calendar day."""
    day = when.astimezone(UTC).date() if when.tzinfo else when.date()
    prefix = f"MY-{day.strftime('%Y%m%d')}-"
    existing = (
        session.execute(
            select(PosOrder.bill_number).where(
                PosOrder.location_id == location_id,
                PosOrder.bill_number.like(f"{prefix}%"),
            )
        )
        .scalars()
        .all()
    )
    max_seq = 0
    for bill in existing:
        suffix = bill.removeprefix(prefix)
        if suffix.isdigit():
            max_seq = max(max_seq, int(suffix))
    return f"{prefix}{max_seq + 1:05d}"


def get_order(session: Session, order_id: int) -> PosOrder | None:
    return (
        session.execute(
            select(PosOrder)
            .options(joinedload(PosOrder.lines))
            .where(PosOrder.id == order_id)
            .execution_options(populate_existing=True)
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
        .options(joinedload(PosOrder.lines))
        .where(PosOrder.location_id == location_id)
        .order_by(PosOrder.opened_at.desc())
    )
    if status is not None:
        stmt = stmt.where(PosOrder.status == status)
    if since is not None:
        stmt = stmt.where(PosOrder.opened_at >= since)
    return list(session.execute(stmt).unique().scalars().all())


def open_order(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str,
    table_label: str | None = None,
) -> PosOrder:
    now = _utcnow()
    order = PosOrder(
        location_id=location_id,
        bill_number=next_bill_number(session, location_id, now),
        status=POS_STATUS_OPEN,
        opened_at=now,
        opened_by_clerk_user_id=clerk_user_id,
        discount_amount=0.0,
        table_label=normalize_table_label(table_label),
    )
    session.add(order)
    session.flush()
    return get_order(session, order.id) or order


def _require_open(order: PosOrder) -> None:
    if order.status != POS_STATUS_OPEN:
        raise ValueError(f"Order {order.id} is not open (status={order.status})")


def _menu_item_for_location(session: Session, *, location_id: int, menu_item_id: int) -> MenuItem:
    item = session.get(MenuItem, menu_item_id)
    if item is None:
        raise ValueError("Menu item not found")
    menu = session.get(Menu, item.menu_id)
    if menu is None or menu.location_id != location_id:
        raise ValueError("Menu item does not belong to this location")
    if not item.is_available:
        raise ValueError("Menu item is not available")
    # Ensure category is loaded for snapshot
    _ = item.category
    return item


def add_line(
    session: Session,
    *,
    order_id: int,
    menu_item_id: int,
    qty: int,
) -> PosOrder:
    if qty < 1:
        raise ValueError("qty must be at least 1")
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)

    item = _menu_item_for_location(
        session, location_id=order.location_id, menu_item_id=menu_item_id
    )
    category_name = item.category.name if item.category is not None else ""
    next_sort = max((line.sort_order for line in order.lines), default=-1) + 1
    line = PosOrderLine(
        pos_order_id=order.id,
        menu_item_id=item.id,
        name_snapshot=item.name,
        menu_category_snapshot=category_name,
        menu_category_detail_snapshot=category_name,
        qty=qty,
        unit_price=float(item.price),
        line_total=float(item.price) * qty,
        sort_order=next_sort,
    )
    session.add(line)
    session.flush()
    return get_order(session, order.id) or order


def update_line_qty(session: Session, *, line_id: int, qty: int) -> PosOrder:
    if qty < 1:
        raise ValueError("qty must be at least 1")
    line = session.get(PosOrderLine, line_id)
    if line is None:
        raise ValueError("Order line not found")
    order = get_order(session, line.pos_order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    line.qty = qty
    line.line_total = float(line.unit_price) * qty
    session.flush()
    return get_order(session, order.id) or order


def remove_line(session: Session, *, line_id: int) -> PosOrder:
    line = session.get(PosOrderLine, line_id)
    if line is None:
        raise ValueError("Order line not found")
    order_id = line.pos_order_id
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    session.delete(line)
    session.flush()
    return get_order(session, order_id) or order


def set_discount(session: Session, *, order_id: int, amount: float) -> PosOrder:
    if amount < 0:
        raise ValueError("discount_amount must be >= 0")
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    order.discount_amount = float(amount)
    session.flush()
    return get_order(session, order.id) or order


def set_table_label(session: Session, *, order_id: int, label: str | None) -> PosOrder:
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    order.table_label = normalize_table_label(label)
    session.flush()
    return get_order(session, order.id) or order


def void_order(session: Session, *, order_id: int) -> PosOrder:
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    order.status = POS_STATUS_VOID
    order.closed_at = _utcnow()
    session.flush()
    return get_order(session, order.id) or order


def allocate_line_revenues(lines: Sequence[PosOrderLine], discount_amount: float) -> list[float]:
    """Pro-rate bill discount across lines; raise if any result would be <= 0."""
    if not lines:
        raise ValueError("Order has no lines")
    subtotal = sum(float(line.line_total) for line in lines)
    if subtotal <= 0:
        raise ValueError("Order subtotal must be positive")
    discount = float(discount_amount or 0)
    if discount < 0:
        raise ValueError("discount_amount must be >= 0")
    if discount >= subtotal:
        raise ValueError("discount_amount must leave every line with positive revenue")

    if discount == 0:
        revenues = [float(line.line_total) for line in lines]
    else:
        # Largest-remainder style allocation so cents sum exactly
        raw = [
            float(line.line_total) - (discount * (float(line.line_total) / subtotal))
            for line in lines
        ]
        # Round to 2 decimals then fix drift on the last line
        rounded = [round(v, 2) for v in raw]
        target = round(subtotal - discount, 2)
        drift = round(target - sum(rounded), 2)
        if rounded:
            rounded[-1] = round(rounded[-1] + drift, 2)
        revenues = rounded

    if any(r <= 0 for r in revenues):
        raise ValueError("discount_amount must leave every line with positive revenue")
    return revenues


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
) -> PosOrder:
    if payment_method not in PAYMENT_METHODS:
        raise ValueError(f"Invalid payment_method: {payment_method}")

    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")

    # Idempotent: already paid → return without re-projecting facts
    if order.status == POS_STATUS_PAID:
        return order
    _require_open(order)
    if not order.lines:
        raise ValueError("Cannot close an empty order")

    revenues = allocate_line_revenues(order.lines, order.discount_amount)
    closed_at = _utcnow()
    run = get_or_create_monthly_pos_run(
        session,
        location_id=order.location_id,
        closed_on=closed_at.astimezone(UTC).date(),
    )

    mappings: list[dict[str, object]] = []
    for line, revenue in zip(order.lines, revenues, strict=True):
        mappings.append(
            {
                "analytics_run_id": run.id,
                "bill_number": order.bill_number,
                "menu": line.name_snapshot,
                "qty": line.qty,
                "price": float(line.unit_price),
                "total_after_bill_discount": revenue,
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
    return get_order(session, order.id) or order
