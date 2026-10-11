"""Native POS ticket lifecycle and OrderFact projection."""

from __future__ import annotations

import calendar
from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Any

from sqlalchemy import insert, select
from sqlalchemy.orm import Session, joinedload, selectinload

from graphql.data_sources import AnalyticsRun, OrderFact
from graphql.data_sources.models.menu import Menu, MenuItem, MenuModifierGroup, MenuModifierOption
from graphql.data_sources.models.pos_bill_sequence import PosBillSequence
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine, PosOrderLineModifier
from graphql.data_sources.models.pos_register import PosRegister
from graphql.services import pos_fiscalization as fiscal
from graphql.services.pos_audit import record_pos_audit
from graphql.services.pos_money import cents_to_euros, euros_to_cents
from graphql.services.pos_tax import (
    normalize_tax_class,
    recompute_order_tax,
    resolve_tax_rate_bps,
    tax_breakdown_by_rate,
)

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


def _lock_order(session: Session, order_id: int) -> PosOrder | None:
    """Load and row-lock a POS order (FOR UPDATE)."""
    return session.scalar(
        select(PosOrder).where(PosOrder.id == order_id).with_for_update()
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


def ensure_default_register(session: Session, location_id: int) -> PosRegister:
    existing = session.scalar(
        select(PosRegister).where(
            PosRegister.location_id == location_id,
            PosRegister.code == DEFAULT_REGISTER_CODE,
        )
    )
    if existing is not None:
        return existing
    register = PosRegister(
        location_id=location_id,
        code=DEFAULT_REGISTER_CODE,
        label=DEFAULT_REGISTER_LABEL,
    )
    session.add(register)
    session.flush()
    return register


def next_bill_number(session: Session, location_id: int, when: datetime) -> str:
    """Return ``MY-YYYYMMDD-#####`` unique for the location on that calendar day."""
    day = when.astimezone(UTC).date() if when.tzinfo else when.date()
    day_key = day.strftime("%Y%m%d")
    prefix = f"MY-{day_key}-"

    seq = session.scalar(
        select(PosBillSequence)
        .where(
            PosBillSequence.location_id == location_id,
            PosBillSequence.day_key == day_key,
        )
        .with_for_update()
    )
    if seq is None:
        seq = PosBillSequence(location_id=location_id, day_key=day_key, next_seq=1)
        session.add(seq)
        session.flush()
        # Re-lock after insert for engines that need it
        seq = session.scalar(
            select(PosBillSequence)
            .where(PosBillSequence.id == seq.id)
            .with_for_update()
        )
        assert seq is not None

    number = seq.next_seq
    seq.next_seq = number + 1
    session.flush()
    return f"{prefix}{number:05d}"


PUBLIC_MENU_ORDER_NOTE = "digital_menu"


def open_order(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str,
    table_label: str | None = None,
) -> PosOrder:
    now = _utcnow()
    register = ensure_default_register(session, location_id)
    order = PosOrder(
        location_id=location_id,
        register_id=register.id,
        bill_number=next_bill_number(session, location_id, now),
        status=POS_STATUS_OPEN,
        opened_at=now,
        opened_by_clerk_user_id=clerk_user_id,
        discount_cents=0,
        net_cents=0,
        tax_cents=0,
        gross_cents=0,
        table_label=normalize_table_label(table_label),
    )
    session.add(order)
    session.flush()
    record_pos_audit(
        session,
        location_id=location_id,
        pos_order_id=order.id,
        actor_clerk_user_id=clerk_user_id,
        action="open",
        payload={"bill_number": order.bill_number, "register_id": register.id},
    )
    fiscal.start_sale_process(session, order, actor_clerk_user_id=clerk_user_id)
    return get_order(session, order.id) or order


def submit_public_menu_order(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str,
    lines: Sequence[tuple[int, int]],
    table_label: str | None = None,
) -> PosOrder:
    """Open a guest digital-menu ticket and add lines (no modifiers / no payment)."""
    if not lines:
        raise ValueError("At least one line is required")

    menu = session.scalar(select(Menu).where(Menu.location_id == location_id))
    if menu is None or not bool(menu.public_enabled):
        raise ValueError("Public digital menu is not published for this location")

    order = open_order(
        session,
        location_id=location_id,
        clerk_user_id=clerk_user_id,
        table_label=table_label,
    )
    order.note = PUBLIC_MENU_ORDER_NOTE
    session.flush()

    for menu_item_id, qty in lines:
        add_line(
            session,
            order_id=order.id,
            menu_item_id=menu_item_id,
            qty=qty,
            modifier_option_ids=None,
            note=None,
            actor_clerk_user_id=clerk_user_id,
        )

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
            raise ValueError(f"modifier option {opt_id} does not belong to this menu item")
        group, opt = pair
        if not opt.is_available:
            raise ValueError(f"modifier option {opt.name} is not available")
        selected.append((group, opt))

    counts: dict[int, int] = {}
    for group, _opt in selected:
        counts[group.id] = counts.get(group.id, 0) + 1

    for group in item.modifier_groups:
        count = counts.get(group.id, 0)
        if count < group.min_select:
            raise ValueError(
                f"modifier group '{group.name}' requires at least {group.min_select} selection(s)"
            )
        if count > group.max_select:
            raise ValueError(
                f"modifier group '{group.name}' allows at most {group.max_select} selection(s)"
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
    actor_clerk_user_id: str | None = None,
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
    delta_cents = sum(euros_to_cents(float(opt.price_delta)) for _group, opt in selected)
    unit_price_cents = euros_to_cents(float(item.price)) + delta_cents
    tax_class = normalize_tax_class(getattr(item, "tax_class", None))
    rate_bps = resolve_tax_rate_bps(
        session, tax_class=tax_class, on_date=_utcnow().astimezone(UTC).date()
    )
    category_name = item.category.name if item.category is not None else ""
    next_sort = max((line.sort_order for line in order.lines), default=-1) + 1
    pre_gross = unit_price_cents * qty
    line = PosOrderLine(
        pos_order_id=order.id,
        menu_item_id=item.id,
        name_snapshot=item.name,
        menu_category_snapshot=category_name,
        menu_category_detail_snapshot=category_name,
        qty=qty,
        unit_price_cents=unit_price_cents,
        tax_class_snapshot=tax_class,
        tax_rate_bps_snapshot=rate_bps,
        gross_cents=pre_gross,
        net_cents=0,
        tax_cents=0,
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
                price_delta_cents=euros_to_cents(float(opt.price_delta)),
                sort_order=index,
            )
        )
    session.flush()
    order = get_order(session, order.id) or order
    recompute_order_tax(order)
    session.flush()
    fiscal.update_sale_process(session, order, actor_clerk_user_id=actor_clerk_user_id)
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="add_line",
            payload={"line_id": line.id, "menu_item_id": menu_item_id, "qty": qty},
        )
    return get_order(session, order.id) or order


def set_line_note(
    session: Session,
    *,
    line_id: int,
    note: str | None,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
    line = session.get(PosOrderLine, line_id)
    if line is None:
        raise ValueError("Order line not found")
    order = get_order(session, line.pos_order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    line.note = normalize_line_note(note)
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="set_line_note",
            payload={"line_id": line_id},
        )
    return get_order(session, order.id) or order


def update_line_qty(
    session: Session,
    *,
    line_id: int,
    qty: int,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
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
    session.flush()
    order = get_order(session, order.id) or order
    recompute_order_tax(order)
    session.flush()
    fiscal.update_sale_process(session, order, actor_clerk_user_id=actor_clerk_user_id)
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="update_line_qty",
            payload={"line_id": line_id, "qty": qty},
        )
    return get_order(session, order.id) or order


def remove_line(
    session: Session,
    *,
    line_id: int,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
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
    order = get_order(session, order_id) or order
    recompute_order_tax(order)
    session.flush()
    fiscal.update_sale_process(session, order, actor_clerk_user_id=actor_clerk_user_id)
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="remove_line",
            payload={"line_id": line_id},
        )
    return get_order(session, order_id) or order


def set_discount(
    session: Session,
    *,
    order_id: int,
    amount: float,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
    if amount < 0:
        raise ValueError("discount_amount must be >= 0")
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    order.discount_cents = euros_to_cents(float(amount))
    session.flush()
    order = get_order(session, order.id) or order
    if order.lines:
        recompute_order_tax(order)
    else:
        order.net_cents = 0
        order.tax_cents = 0
        order.gross_cents = 0
    session.flush()
    fiscal.update_sale_process(session, order, actor_clerk_user_id=actor_clerk_user_id)
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="set_discount",
            payload={"discount_cents": order.discount_cents},
        )
    return get_order(session, order.id) or order


def set_table_label(
    session: Session,
    *,
    order_id: int,
    label: str | None,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    order.table_label = normalize_table_label(label)
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="set_table_label",
            payload={"table_label": order.table_label},
        )
    return get_order(session, order.id) or order


def void_order(
    session: Session,
    *,
    order_id: int,
    actor_clerk_user_id: str | None = None,
) -> PosOrder:
    order = get_order(session, order_id)
    if order is None:
        raise ValueError("Order not found")
    _require_open(order)
    fiscal.cancel_sale_process(session, order, actor_clerk_user_id=actor_clerk_user_id)
    order.status = POS_STATUS_VOID
    order.closed_at = _utcnow()
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="void",
            payload={"bill_number": order.bill_number},
        )
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

    fiscal.start_and_finish_refund_process(
        session, order, actor_clerk_user_id=actor_clerk_user_id
    )

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


def allocate_line_revenues(lines: Sequence[PosOrderLine], discount_amount: float) -> list[float]:
    """Legacy helper: pro-rate bill discount; returns euros after discount per line."""
    from graphql.services.pos_tax import allocate_discount_and_tax

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
