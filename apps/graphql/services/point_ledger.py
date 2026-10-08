"""Clerk-keyed point ledger: award credits and read balances/history."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from graphql.data_sources.models.location import Location
from graphql.data_sources.models.point_ledger_entry import PointLedgerEntry
from graphql.data_sources.models.pos_order import PosOrder
from graphql.services.point_earn_rules import (
    ACTION_KEY_COMPLETE_ORDER,
    ACTION_KEY_OPEN_MENU_QR,
    KNOWN_POINT_EARN_ACTION_KEYS,
    list_rules_for_location,
    normalize_action_key,
)
from graphql.services.service_subscriptions import (
    SERVICE_KEY_POINT_SYSTEM,
    is_active_subscription,
)

# Keep in sync with graphql.services.pos_orders.PUBLIC_MENU_ORDER_NOTE
PUBLIC_MENU_ORDER_NOTE = "digital_menu"


@dataclass(frozen=True, slots=True)
class PointBalanceView:
    location_id: int
    location_name: str
    balance: int


@dataclass(frozen=True, slots=True)
class PointEntryView:
    id: str
    location_id: int
    location_name: str
    amount: int
    action_key: str
    label: str | None
    created_at: datetime


@dataclass(frozen=True, slots=True)
class PointEarnResult:
    awarded: bool
    balance: int
    entry: PointLedgerEntry | None


def source_ref_for_pos_order(order_id: int) -> str:
    return f"pos_order:{order_id}"


def source_ref_for_menu_open(on_day: date | None = None) -> str:
    day = on_day or datetime.now(UTC).date()
    return f"menu_open:{day.isoformat()}"


def balance_for_location(session: Session, *, clerk_user_id: str, location_id: int) -> int:
    total = (
        session.query(func.coalesce(func.sum(PointLedgerEntry.amount), 0))
        .filter(
            PointLedgerEntry.clerk_user_id == clerk_user_id,
            PointLedgerEntry.location_id == location_id,
        )
        .scalar()
    )
    return int(total or 0)


def list_balances_for_user(session: Session, *, clerk_user_id: str) -> list[PointBalanceView]:
    rows = (
        session.execute(
            select(
                PointLedgerEntry.location_id,
                Location.name,
                func.coalesce(func.sum(PointLedgerEntry.amount), 0),
            )
            .join(Location, Location.id == PointLedgerEntry.location_id)
            .where(PointLedgerEntry.clerk_user_id == clerk_user_id)
            .group_by(PointLedgerEntry.location_id, Location.name)
            .order_by(Location.name.asc())
        )
        .all()
    )
    return [
        PointBalanceView(
            location_id=int(location_id),
            location_name=str(location_name),
            balance=int(balance or 0),
        )
        for location_id, location_name, balance in rows
    ]


def list_entries_for_user(
    session: Session,
    *,
    clerk_user_id: str,
    limit: int = 20,
) -> list[PointEntryView]:
    capped = max(1, min(int(limit), 100))
    rows = (
        session.execute(
            select(PointLedgerEntry, Location.name)
            .join(Location, Location.id == PointLedgerEntry.location_id)
            .where(PointLedgerEntry.clerk_user_id == clerk_user_id)
            .order_by(PointLedgerEntry.created_at.desc())
            .limit(capped)
        )
        .all()
    )
    return [
        PointEntryView(
            id=str(entry.id),
            location_id=int(entry.location_id),
            location_name=str(location_name),
            amount=int(entry.amount),
            action_key=entry.action_key,
            label=entry.label,
            created_at=entry.created_at,
        )
        for entry, location_name in rows
    ]


def _existing_entry(
    session: Session,
    *,
    clerk_user_id: str,
    location_id: int,
    action_key: str,
    source_ref: str,
) -> PointLedgerEntry | None:
    return session.scalar(
        select(PointLedgerEntry).where(
            PointLedgerEntry.clerk_user_id == clerk_user_id,
            PointLedgerEntry.location_id == location_id,
            PointLedgerEntry.action_key == action_key,
            PointLedgerEntry.source_ref == source_ref,
        )
    )


def _insert_ledger_entry(
    session: Session,
    *,
    clerk_user_id: str,
    location_id: int,
    amount: int,
    action_key: str,
    source_ref: str,
    label: str | None,
) -> PointEarnResult:
    """Idempotent insert of a ledger credit. Assumes amount > 0 and auth already checked."""
    existing = _existing_entry(
        session,
        clerk_user_id=clerk_user_id,
        location_id=location_id,
        action_key=action_key,
        source_ref=source_ref,
    )
    if existing is not None:
        return PointEarnResult(
            awarded=False,
            balance=balance_for_location(
                session, clerk_user_id=clerk_user_id, location_id=location_id
            ),
            entry=existing,
        )

    try:
        with session.begin_nested():
            entry = PointLedgerEntry(
                clerk_user_id=clerk_user_id,
                location_id=location_id,
                amount=int(amount),
                action_key=action_key,
                source_ref=source_ref,
                label=label,
            )
            session.add(entry)
            session.flush()
    except IntegrityError:
        existing = _existing_entry(
            session,
            clerk_user_id=clerk_user_id,
            location_id=location_id,
            action_key=action_key,
            source_ref=source_ref,
        )
        return PointEarnResult(
            awarded=False,
            balance=balance_for_location(
                session, clerk_user_id=clerk_user_id, location_id=location_id
            ),
            entry=existing,
        )

    return PointEarnResult(
        awarded=True,
        balance=balance_for_location(
            session, clerk_user_id=clerk_user_id, location_id=location_id
        ),
        entry=entry,
    )


def award_for_action(
    session: Session,
    *,
    clerk_user_id: str,
    location_id: int,
    action_key: str,
    source_ref: str,
    label: str | None = None,
) -> PointEarnResult:
    """Credit points when the location has an active Point System and enabled rule.

    Idempotent on ``(clerk_user_id, location_id, action_key, source_ref)``.
    Returns ``awarded=False`` when subscription/rule does not apply or the
    credit already exists.
    """
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        return PointEarnResult(awarded=False, balance=0, entry=None)

    ref = (source_ref or "").strip()
    if not ref:
        raise ValueError("source_ref is required")

    key = normalize_action_key(action_key)

    if not is_active_subscription(session, location_id, SERVICE_KEY_POINT_SYSTEM):
        return PointEarnResult(
            awarded=False,
            balance=balance_for_location(session, clerk_user_id=user_id, location_id=location_id),
            entry=None,
        )

    rule = next(
        (r for r in list_rules_for_location(session, location_id) if r.action_key == key),
        None,
    )
    if rule is None or not rule.enabled or rule.points <= 0:
        return PointEarnResult(
            awarded=False,
            balance=balance_for_location(session, clerk_user_id=user_id, location_id=location_id),
            entry=None,
        )

    return _insert_ledger_entry(
        session,
        clerk_user_id=user_id,
        location_id=location_id,
        amount=int(rule.points),
        action_key=key,
        source_ref=ref,
        label=label,
    )


def award_fixed_amount(
    session: Session,
    *,
    clerk_user_id: str,
    location_id: int,
    amount: int,
    action_key: str,
    source_ref: str,
    label: str | None = None,
) -> PointEarnResult:
    """Credit an explicit point amount when Point System is active.

    Used by Prediction (and similar) where points come from the feature config,
    not the global earn-rule catalog. Soft no-op when Points is off or amount ≤ 0.
    Idempotent on ``(clerk_user_id, location_id, action_key, source_ref)``.
    """
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        return PointEarnResult(awarded=False, balance=0, entry=None)

    ref = (source_ref or "").strip()
    if not ref:
        raise ValueError("source_ref is required")

    key = (action_key or "").strip().lower()
    if not key:
        raise ValueError("action_key is required")

    pts = int(amount)
    if pts <= 0:
        return PointEarnResult(
            awarded=False,
            balance=balance_for_location(session, clerk_user_id=user_id, location_id=location_id),
            entry=None,
        )

    if not is_active_subscription(session, location_id, SERVICE_KEY_POINT_SYSTEM):
        return PointEarnResult(
            awarded=False,
            balance=balance_for_location(session, clerk_user_id=user_id, location_id=location_id),
            entry=None,
        )

    return _insert_ledger_entry(
        session,
        clerk_user_id=user_id,
        location_id=location_id,
        amount=pts,
        action_key=key,
        source_ref=ref,
        label=label,
    )


def award_for_digital_menu_order_paid(session: Session, order: PosOrder) -> PointEarnResult | None:
    """Award ``complete_order`` points for a paid digital-menu guest ticket."""
    if order.note != PUBLIC_MENU_ORDER_NOTE:
        return None
    guest_id = (order.opened_by_clerk_user_id or "").strip()
    if not guest_id:
        return None
    return award_for_action(
        session,
        clerk_user_id=guest_id,
        location_id=int(order.location_id),
        action_key=ACTION_KEY_COMPLETE_ORDER,
        source_ref=source_ref_for_pos_order(int(order.id)),
        label=f"Order {order.bill_number}",
    )


def award_for_menu_open(
    session: Session,
    *,
    clerk_user_id: str,
    location_id: int,
) -> PointEarnResult:
    """Award ``open_menu_qr`` once per UTC calendar day per location."""
    return award_for_action(
        session,
        clerk_user_id=clerk_user_id,
        location_id=location_id,
        action_key=ACTION_KEY_OPEN_MENU_QR,
        source_ref=source_ref_for_menu_open(),
    )


def require_guest_earn_action_key(action_key: str) -> str:
    """Validate action keys allowed on the guest recordPointEarnEvent mutation."""
    key = normalize_action_key(action_key)
    if key != ACTION_KEY_OPEN_MENU_QR:
        raise ValueError(
            f"Unsupported earn action for guest record: {action_key!r}. "
            f"Expected {ACTION_KEY_OPEN_MENU_QR!r}."
        )
    if key not in KNOWN_POINT_EARN_ACTION_KEYS:
        raise ValueError(f"Unknown point earn action key: {action_key!r}")
    return key
