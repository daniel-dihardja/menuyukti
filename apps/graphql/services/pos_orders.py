"""Native POS ticket lifecycle and OrderFact projection."""

from __future__ import annotations

import calendar
from collections.abc import Sequence
from datetime import UTC, date, datetime

from sqlalchemy import delete, insert, select
from sqlalchemy.orm import Session, joinedload, selectinload

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.data_sources.models.menu import Menu, MenuItem, MenuModifierGroup, MenuModifierOption
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine, PosOrderLineModifier

POS_SYSTEM = "menuyukti"
POS_STATUS_OPEN = "open"
POS_STATUS_PAID = "paid"
POS_STATUS_VOID = "void"
POS_STATUS_REFUNDED = "refunded"
PAYMENT_METHODS = frozenset({"cash", "card", "other"})
TABLE_LABEL_MAX_LEN = 64
LINE_NOTE_MAX_LEN = 256


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


def normalize_line_note(note: str | None) -> str | None:
    if note is None:
        return None
    cleaned = note.strip()
    if not cleaned:
        return None
    if len(cleaned) > LINE_NOTE_MAX_LEN:
        raise ValueError(f"line note must be at most {LINE_NOTE_MAX_LEN} characters")
    return cleaned


def _order_load_options():
    return selectinload(PosOrder.lines).selectinload(PosOrderLine.modifiers)


def get_order(session: Session, order_id: int) -> PosOrder | None:
    return (
        session.execute(
            select(PosOrder)
            .options(_order_load_options())
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
        .options(_order_load_options())
        .where(PosOrder.location_id == location_id)
        .order_by(PosOrder.opened_at.desc())
    )
    if status is not None:
        stmt = stmt.where(PosOrder.status == status)
    if since is not None:
        stmt = stmt.where(PosOrder.opened_at >= since)
    return list(session.execute(stmt).unique().scalars().all())


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
    item = session.scalar(
        select(MenuItem)
        .where(MenuItem.id == menu_item_id)
        .options(
            selectinload(MenuItem.modifier_groups).selectinload(MenuModifierGroup.options),
            joinedload(MenuItem.category),
        )
    )
    if item is None:
        raise ValueError("Menu item not found")
    menu = session.get(Menu, item.menu_id)
    if menu is None or menu.location_id != location_id:
        raise ValueError("Menu item does not belong to this location")
    if not item.is_available:
        raise ValueError("Menu item is not available")
    return item


def _resolve_selected_modifiers(
    item: MenuItem,
    modifier_option_ids: Sequence[int] | None,
) -> list[tuple[MenuModifierGroup, MenuModifierOption]]:
    selected_ids = list(modifier_option_ids or [])
    if len(selected_ids) != len(set(selected_ids)):
        raise ValueError("Duplicate modifier options are not allowed")

    options_by_id: dict[int, tuple[MenuModifierGroup, MenuModifierOption]] = {}
    for group in item.modifier_groups:
        for opt in group.options:
            options_by_id[opt.id] = (group, opt)

    selected: list[tuple[MenuModifierGroup, MenuModifierOption]] = []
    for opt_id in selected_ids:
        pair = options_by_id.get(opt_id)
        if pair is None:
            raise ValueError(f"Modifier option {opt_id} does not belong to this menu item")
        group, opt = pair
        if not opt.is_available:
            raise ValueError(f"Modifier option {opt.name} is not available")
        selected.append((group, opt))

    counts: dict[int, int] = {}
    for group, _opt in selected:
        counts[group.id] = counts.get(group.id, 0) + 1

    for group in item.modifier_groups:
        count = counts.get(group.id, 0)
        if count < group.min_select:
            raise ValueError(
                f"Modifier group '{group.name}' requires at least {group.min_select} selection(s)"
            )
        if count > group.max_select:
            raise ValueError(
                f"Modifier group '{group.name}' allows at most {group.max_select} selection(s)"
            )

    return selected


def add_line(
    session: Session,
    *,
    order_id: int,
    menu_item_id: int,
    qty: int,
    modifier_option_ids: Sequence[int] | None = None,
    note: str | None = None,
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
    selected = _resolve_selected_modifiers(item, modifier_option_ids)
    delta = sum(float(opt.price_delta) for _group, opt in selected)
    unit_price = float(item.price) + delta
    category_name = item.category.name if item.category is not None else ""
    next_sort = max((line.sort_order for line in order.lines), default=-1) + 1
    line = PosOrderLine(
        pos_order_id=order.id,
        menu_item_id=item.id,
        name_snapshot=item.name,
        menu_category_snapshot=category_name,
        menu_category_detail_snapshot=category_name,
        qty=qty,
        unit_price=unit_price,
        line_total=unit_price * qty,
        note=normalize_line_note(note),
        sort_order=next_sort,
    )
    session.add(line)
    session.flush()
    for index, (group, opt) in enumerate(selected):
        session.add(
            PosOrderLineModifier(
                pos_order_line_id=line.id,
                group_name_snapshot=group.name,
                name_snapshot=opt.name,
                price_delta_snapshot=float(opt.price_delta),
                sort_order=index,
            )
        )
    session.flush()
    return get_order(session, order.id) or order


def set_line_note(session: Session, *, line_id: int, note: str | None) -> PosOrder:
    line = session.get(PosOrderLine, line_id)
    if line is None:
        raise ValueError("Order line not found")
    order = get_order(session, line.pos_order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    line.note = normalize_line_note(note)
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


def refund_order(session: Session, *, order_id: int) -> PosOrder:
    """Full post-pay refund: delete projected OrderFacts and mark ticket refunded."""
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    if order.status == POS_STATUS_REFUNDED:
        raise ValueError(f"Order {order.id} is already refunded")
    if order.status != POS_STATUS_PAID:
        raise ValueError(f"Order {order.id} is not paid (status={order.status})")

    run_ids: list[int] = []
    if order.closed_at is not None:
        closed_on = order.closed_at.astimezone(UTC).date()
        year, month = closed_on.year, closed_on.month
        period_start = date(year, month, 1)
        period_end = date(year, month, calendar.monthrange(year, month)[1])
        run = (
            session.execute(
                select(AnalyticsRun).where(
                    AnalyticsRun.location_id == order.location_id,
                    AnalyticsRun.pos_system == POS_SYSTEM,
                    AnalyticsRun.period_start == period_start,
                    AnalyticsRun.period_end == period_end,
                )
            )
            .scalars()
            .first()
        )
        if run is not None:
            run_ids.append(run.id)

    if not run_ids:
        run_ids = list(
            session.execute(
                select(AnalyticsRun.id).where(
                    AnalyticsRun.location_id == order.location_id,
                    AnalyticsRun.pos_system == POS_SYSTEM,
                )
            )
            .scalars()
            .all()
        )

    if run_ids:
        session.execute(
            delete(OrderFact).where(
                OrderFact.bill_number == order.bill_number,
                OrderFact.pos_system == POS_SYSTEM,
                OrderFact.analytics_run_id.in_(run_ids),
            )
        )
    else:
        session.execute(
            delete(OrderFact).where(
                OrderFact.bill_number == order.bill_number,
                OrderFact.pos_system == POS_SYSTEM,
            )
        )

    order.status = POS_STATUS_REFUNDED
    order.refunded_at = _utcnow()
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


def order_gross_total(order: PosOrder) -> float:
    subtotal = sum(float(line.line_total) for line in order.lines)
    return max(0.0, subtotal - float(order.discount_amount or 0))


def day_summary(
    session: Session,
    *,
    location_id: int,
    on_date: date,
) -> dict[str, object]:
    """Aggregate POS ticket stats for a UTC calendar day."""
    start = datetime.combine(on_date, datetime.min.time(), tzinfo=UTC)
    orders = list_orders(session, location_id, since=start)

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
            if order.opened_at.astimezone(UTC).date() == on_date:
                open_count += 1
            continue
        if order.status == POS_STATUS_VOID:
            closed = order.closed_at or order.opened_at
            if closed.astimezone(UTC).date() == on_date:
                void_count += 1
            continue
        if order.status == POS_STATUS_REFUNDED:
            when = order.refunded_at or order.closed_at or order.opened_at
            if when.astimezone(UTC).date() == on_date:
                refunded_count += 1
                refunded_gross_total += order_gross_total(order)
            continue
        if order.status == POS_STATUS_PAID:
            closed = order.closed_at or order.opened_at
            if closed.astimezone(UTC).date() != on_date:
                continue
            paid_count += 1
            paid_discount_total += float(order.discount_amount or 0)
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
