"""Menu item feedback: guest submit + owner moderation for digital menu."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from graphql.access import require_location_owner
from graphql.data_sources.models.menu import Menu, MenuItem
from graphql.data_sources.models.menu_item_feedback import (
    FEEDBACK_BODY_MAX_LEN,
    FEEDBACK_SENTIMENT_NEGATIVE,
    FEEDBACK_STATUS_HIDDEN,
    FEEDBACK_STATUS_PENDING,
    FEEDBACK_STATUS_PUBLISHED,
    KNOWN_FEEDBACK_SENTIMENTS,
    KNOWN_FEEDBACK_STATUSES,
    MenuItemFeedback,
)
from graphql.data_sources.models.pos_order import PosOrder
from graphql.services.pos_order_constants import PUBLIC_MENU_ORDER_NOTE

PUBLIC_FEEDBACK_PER_ITEM_CAP = 5
OWNER_REPLY_MAX_LEN = 500


@dataclass(frozen=True, slots=True)
class MenuItemFeedbackView:
    id: int
    location_id: int
    menu_item_id: int
    menu_item_name: str
    pos_order_id: int | None
    clerk_user_id: str
    sentiment: str | None
    body: str
    guest_display_name: str | None
    owner_reply: str | None
    owner_replied_at: datetime | None
    status: str
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


def _to_view(row: MenuItemFeedback, *, menu_item_name: str = "") -> MenuItemFeedbackView:
    name = menu_item_name
    if not name and row.menu_item is not None:
        name = row.menu_item.name
    return MenuItemFeedbackView(
        id=int(row.id),
        location_id=int(row.location_id),
        menu_item_id=int(row.menu_item_id),
        menu_item_name=name,
        pos_order_id=int(row.pos_order_id) if row.pos_order_id is not None else None,
        clerk_user_id=row.clerk_user_id,
        sentiment=row.sentiment,
        body=row.body,
        guest_display_name=row.guest_display_name,
        owner_reply=row.owner_reply,
        owner_replied_at=row.owner_replied_at,
        status=row.status,
        published_at=row.published_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def _normalize_body(
    body: str | None,
    *,
    required: bool,
    max_len: int = FEEDBACK_BODY_MAX_LEN,
) -> str:
    cleaned = (body or "").strip()
    if not cleaned:
        if required:
            raise ValueError("A short note is required with a thumbs down")
        return ""
    if len(cleaned) > max_len:
        raise ValueError(f"Feedback body must be at most {max_len} characters")
    return cleaned


def _normalize_display_name(name: str | None) -> str | None:
    if name is None:
        return None
    cleaned = name.strip()
    if not cleaned:
        return None
    return cleaned[:128]


def _load_feedback(session: Session, feedback_id: int) -> MenuItemFeedback | None:
    return session.scalars(
        select(MenuItemFeedback)
        .options(selectinload(MenuItemFeedback.menu_item))
        .where(MenuItemFeedback.id == feedback_id)
    ).one_or_none()


def submit_feedback(
    session: Session,
    *,
    clerk_user_id: str,
    location_id: int,
    menu_item_id: int,
    sentiment: str | None = None,
    body: str = "",
    guest_display_name: str | None = None,
    pos_order_id: int | None = None,
) -> MenuItemFeedbackView:
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        raise ValueError("Missing authenticated user for submitMenuItemFeedback")

    sentiment_key: str | None = None
    if sentiment is not None and str(sentiment).strip():
        sentiment_key = str(sentiment).strip().lower()
        if sentiment_key not in KNOWN_FEEDBACK_SENTIMENTS:
            raise ValueError("sentiment must be positive or negative")

    cleaned_body = _normalize_body(
        body,
        required=sentiment_key == FEEDBACK_SENTIMENT_NEGATIVE,
    )
    if sentiment_key is None and not cleaned_body:
        raise ValueError("Provide a thumbs rating or a short note")
    display_name = _normalize_display_name(guest_display_name)

    menu = session.scalar(select(Menu).where(Menu.location_id == location_id))
    if menu is None or not bool(menu.public_enabled):
        raise ValueError("Public digital menu is not published for this location")

    menu_item = session.get(MenuItem, menu_item_id)
    if menu_item is None or int(menu_item.menu_id) != int(menu.id):
        raise ValueError("Menu item not found on this location menu")
    if not bool(menu_item.is_available):
        raise ValueError("Menu item is not available")

    resolved_order_id: int | None = None
    if pos_order_id is not None:
        order = session.scalars(
            select(PosOrder)
            .options(selectinload(PosOrder.lines))
            .where(PosOrder.id == pos_order_id)
        ).one_or_none()
        if order is None:
            raise ValueError("Order not found")
        if order.note != PUBLIC_MENU_ORDER_NOTE:
            raise ValueError("Feedback order link is only allowed for digital-menu orders")
        if (order.opened_by_clerk_user_id or "").strip() != user_id:
            raise ValueError("Order does not belong to the authenticated user")
        if int(order.location_id) != int(location_id):
            raise ValueError("Order does not belong to this location")
        line_item_ids = {int(line.menu_item_id) for line in order.lines}
        if int(menu_item_id) not in line_item_ids:
            raise ValueError("Menu item was not on this order")
        resolved_order_id = int(order.id)

    try:
        with session.begin_nested():
            row = MenuItemFeedback(
                location_id=int(location_id),
                menu_item_id=int(menu_item_id),
                pos_order_id=resolved_order_id,
                clerk_user_id=user_id,
                sentiment=sentiment_key,
                body=cleaned_body,
                guest_display_name=display_name,
                status=FEEDBACK_STATUS_PENDING,
            )
            session.add(row)
            session.flush()
    except IntegrityError as exc:
        raise ValueError(
            "You already have pending feedback for this item. Wait for a reply or try later."
        ) from exc

    loaded = _load_feedback(session, int(row.id))
    assert loaded is not None
    return _to_view(loaded)


def list_for_owner(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str,
    status: str | None = None,
) -> list[MenuItemFeedbackView]:
    require_location_owner(session, location_id, clerk_user_id)

    stmt: Select[tuple[MenuItemFeedback]] = (
        select(MenuItemFeedback)
        .options(selectinload(MenuItemFeedback.menu_item))
        .where(MenuItemFeedback.location_id == location_id)
        .order_by(MenuItemFeedback.created_at.desc(), MenuItemFeedback.id.desc())
    )
    if status is not None:
        status_key = status.strip().lower()
        if status_key not in KNOWN_FEEDBACK_STATUSES:
            raise ValueError("Invalid feedback status filter")
        stmt = stmt.where(MenuItemFeedback.status == status_key)

    rows = session.scalars(stmt).all()
    return [_to_view(row) for row in rows]


def reply_to_feedback(
    session: Session,
    *,
    feedback_id: int,
    clerk_user_id: str,
    reply: str,
) -> MenuItemFeedbackView:
    row = _load_feedback(session, feedback_id)
    if row is None:
        raise ValueError("Feedback not found")
    require_location_owner(session, int(row.location_id), clerk_user_id)

    cleaned = _normalize_body(reply, required=True, max_len=OWNER_REPLY_MAX_LEN)
    row.owner_reply = cleaned
    row.owner_replied_at = datetime.now(UTC)
    session.flush()
    return _to_view(row)


def set_feedback_status(
    session: Session,
    *,
    feedback_id: int,
    clerk_user_id: str,
    status: str,
) -> MenuItemFeedbackView:
    status_key = (status or "").strip().lower()
    if status_key not in {FEEDBACK_STATUS_PUBLISHED, FEEDBACK_STATUS_HIDDEN}:
        raise ValueError("status must be published or hidden")

    row = _load_feedback(session, feedback_id)
    if row is None:
        raise ValueError("Feedback not found")
    require_location_owner(session, int(row.location_id), clerk_user_id)

    row.status = status_key
    if status_key == FEEDBACK_STATUS_PUBLISHED:
        row.published_at = row.published_at or datetime.now(UTC)
    session.flush()
    return _to_view(row)


def list_published_for_menu_items(
    session: Session,
    *,
    menu_item_ids: list[int],
    per_item_cap: int = PUBLIC_FEEDBACK_PER_ITEM_CAP,
) -> dict[int, list[MenuItemFeedbackView]]:
    ids = sorted({int(i) for i in menu_item_ids if int(i) > 0})
    if not ids:
        return {}

    rows = session.scalars(
        select(MenuItemFeedback)
        .options(selectinload(MenuItemFeedback.menu_item))
        .where(
            MenuItemFeedback.menu_item_id.in_(ids),
            MenuItemFeedback.status == FEEDBACK_STATUS_PUBLISHED,
        )
        .order_by(MenuItemFeedback.published_at.desc(), MenuItemFeedback.id.desc())
    ).all()

    by_item: dict[int, list[MenuItemFeedbackView]] = defaultdict(list)
    for row in rows:
        item_id = int(row.menu_item_id)
        bucket = by_item[item_id]
        if len(bucket) >= per_item_cap:
            continue
        bucket.append(_to_view(row))
    return dict(by_item)


def count_published_for_menu_items(
    session: Session,
    *,
    menu_item_ids: list[int],
) -> dict[int, int]:
    ids = sorted({int(i) for i in menu_item_ids if int(i) > 0})
    if not ids:
        return {}

    counts = session.execute(
        select(MenuItemFeedback.menu_item_id, func.count())
        .where(
            MenuItemFeedback.menu_item_id.in_(ids),
            MenuItemFeedback.status == FEEDBACK_STATUS_PUBLISHED,
        )
        .group_by(MenuItemFeedback.menu_item_id)
    ).all()
    return {int(item_id): int(count) for item_id, count in counts}


def count_pending_for_location(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str,
) -> int:
    require_location_owner(session, location_id, clerk_user_id)
    return int(
        session.scalar(
            select(func.count())
            .select_from(MenuItemFeedback)
            .where(
                MenuItemFeedback.location_id == location_id,
                MenuItemFeedback.status == FEEDBACK_STATUS_PENDING,
            )
        )
        or 0
    )
