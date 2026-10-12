"""Open POS tickets: open, line edits, void (no OrderFact projection)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from graphql.data_sources.models.menu import Menu, MenuItem, MenuModifierGroup, MenuModifierOption
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine, PosOrderLineModifier
from graphql.services import pos_fiscalization as fiscal
from graphql.services.pos_audit import record_pos_audit
from graphql.services.pos_money import euros_to_cents
from graphql.services.pos_order_constants import (
    FULFILLMENT_DINE_IN,
    FULFILLMENT_PICKUP,
    POS_STATUS_OPEN,
    POS_STATUS_REFUNDED,
    POS_STATUS_VOID,
    PREP_PICKED_UP,
    PREP_READY,
    PREP_RECEIVED,
    PREP_SERVED,
    PUBLIC_MENU_ORDER_NOTE,
    next_prep_status,
    normalize_fulfillment_mode,
    normalize_line_note,
    normalize_table_label,
)
from graphql.services.pos_order_reads import get_open_public_menu_order_for_guest, get_order

_PREP_RESET_ON_APPEND = frozenset({PREP_READY, PREP_SERVED, PREP_PICKED_UP})
from graphql.services.pos_register_bill import ensure_default_register, next_bill_number
from graphql.services.pos_tax import normalize_tax_class, recompute_order_tax, resolve_tax_rate_bps


def _utcnow() -> datetime:
    return datetime.now(UTC)


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
    fulfillment_mode: str,
    table_label: str | None = None,
) -> PosOrder:
    """Open or append to a guest digital-menu ticket (no modifiers / no payment).

    If the guest already has an open digital-menu ticket at this location, lines
    are appended to that ticket (fulfillment/table unchanged). Otherwise a new
    ticket is opened.
    """
    if not lines:
        raise ValueError("At least one line is required")

    menu = session.scalar(select(Menu).where(Menu.location_id == location_id))
    if menu is None or not bool(menu.public_enabled):
        raise ValueError("Public digital menu is not published for this location")

    existing = get_open_public_menu_order_for_guest(
        session,
        location_id=location_id,
        clerk_user_id=clerk_user_id,
    )
    if existing is not None:
        for menu_item_id, qty in lines:
            add_line(
                session,
                order_id=existing.id,
                menu_item_id=menu_item_id,
                qty=qty,
                modifier_option_ids=None,
                note=None,
                actor_clerk_user_id=clerk_user_id,
            )
        order = get_order(session, existing.id) or existing
        current_prep = (order.prep_status or "").strip().lower()
        if current_prep in _PREP_RESET_ON_APPEND:
            order.prep_status = PREP_RECEIVED
            session.flush()
            record_pos_audit(
                session,
                location_id=order.location_id,
                pos_order_id=order.id,
                actor_clerk_user_id=clerk_user_id,
                action="prep_status",
                payload={
                    "from": current_prep,
                    "to": PREP_RECEIVED,
                    "reason": "append_public_menu_lines",
                },
            )
        return get_order(session, order.id) or order

    mode = normalize_fulfillment_mode(fulfillment_mode)
    if mode == FULFILLMENT_PICKUP:
        resolved_table: str | None = None
    else:
        resolved_table = normalize_table_label(table_label)
        if resolved_table is None:
            raise ValueError("table_label is required for dine_in fulfillment")

    if mode == FULFILLMENT_DINE_IN and not bool(menu.allow_dine_in):
        raise ValueError("dine_in fulfillment is not enabled for this menu")
    if mode == FULFILLMENT_PICKUP and not bool(menu.allow_pickup):
        raise ValueError("pickup fulfillment is not enabled for this menu")

    order = open_order(
        session,
        location_id=location_id,
        clerk_user_id=clerk_user_id,
        table_label=resolved_table,
    )
    order.note = PUBLIC_MENU_ORDER_NOTE
    order.fulfillment_mode = mode
    order.prep_status = PREP_RECEIVED
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


def advance_pos_order_prep_status(
    session: Session,
    *,
    order_id: int,
    actor_clerk_user_id: str,
) -> PosOrder:
    """Advance digital-menu prep_status one step forward (no skip / rewind)."""
    order = session.scalar(select(PosOrder).where(PosOrder.id == order_id).with_for_update())
    if order is None:
        raise ValueError("Order not found")
    if order.note != PUBLIC_MENU_ORDER_NOTE:
        raise ValueError("prep_status only applies to digital-menu orders")
    if not order.fulfillment_mode:
        raise ValueError("fulfillment_mode is required to advance prep_status")
    if order.status in (POS_STATUS_VOID, POS_STATUS_REFUNDED):
        raise ValueError(f"Cannot advance prep_status on {order.status} order")

    previous = order.prep_status
    nxt = next_prep_status(previous, order.fulfillment_mode)
    order.prep_status = nxt
    session.flush()
    record_pos_audit(
        session,
        location_id=order.location_id,
        pos_order_id=order.id,
        actor_clerk_user_id=actor_clerk_user_id,
        action="prep_status",
        payload={"from": previous, "to": nxt},
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
