"""Location-scoped pickup offers: create, close, list, live public lookup."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from graphql.data_sources.models.location import Location
from graphql.data_sources.models.pickup_offer import (
    PICKUP_OFFER_STATUS_CLOSED,
    PICKUP_OFFER_STATUS_OPEN,
    PickupOffer,
)
from graphql.services.service_subscriptions import (
    SERVICE_KEY_PICKUP_OFFER,
    is_active_subscription,
)


@dataclass(frozen=True, slots=True)
class PickupOfferView:
    id: int
    location_id: int
    location_name: str
    title: str
    description: str
    status: str
    available_from: datetime
    available_until: datetime
    price: float | None
    created_at: datetime
    is_live: bool


def require_active_pickup_offer(session: Session, location_id: int) -> None:
    if not is_active_subscription(session, location_id, SERVICE_KEY_PICKUP_OFFER):
        raise ValueError("pickup_offer subscription is required for this location")


def _now() -> datetime:
    return datetime.now(UTC)


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def is_offer_live(offer: PickupOffer, now: datetime | None = None) -> bool:
    """True when status is open and now is within [available_from, available_until)."""
    if offer.status != PICKUP_OFFER_STATUS_OPEN:
        return False
    current = now or _now()
    available_from = _ensure_aware(offer.available_from)
    available_until = _ensure_aware(offer.available_until)
    return available_from <= current < available_until


def _maybe_lazy_close(session: Session, offer: PickupOffer, now: datetime | None = None) -> None:
    if offer.status != PICKUP_OFFER_STATUS_OPEN:
        return
    current = now or _now()
    available_until = _ensure_aware(offer.available_until)
    if current >= available_until:
        offer.status = PICKUP_OFFER_STATUS_CLOSED
        session.flush()


def _to_view(offer: PickupOffer, *, location_name: str, now: datetime | None = None) -> PickupOfferView:
    current = now or _now()
    return PickupOfferView(
        id=int(offer.id),
        location_id=int(offer.location_id),
        location_name=location_name,
        title=offer.title,
        description=offer.description or "",
        status=offer.status,
        available_from=offer.available_from,
        available_until=offer.available_until,
        price=float(offer.price) if offer.price is not None else None,
        created_at=offer.created_at,
        is_live=is_offer_live(offer, current),
    )


def _location_name(session: Session, location_id: int) -> str:
    location = session.get(Location, location_id)
    if location is None:
        return ""
    return location.name


def close_open_offers_for_location(session: Session, location_id: int) -> int:
    """Close all open offers for a location (e.g. on subscription cancel)."""
    rows = (
        session.query(PickupOffer)
        .filter(
            PickupOffer.location_id == location_id,
            PickupOffer.status == PICKUP_OFFER_STATUS_OPEN,
        )
        .all()
    )
    for row in rows:
        row.status = PICKUP_OFFER_STATUS_CLOSED
    if rows:
        session.flush()
    return len(rows)


def create_pickup_offer(
    session: Session,
    *,
    location_id: int,
    title: str,
    description: str,
    available_from: datetime,
    available_until: datetime,
    price: float | None = None,
) -> PickupOfferView:
    require_active_pickup_offer(session, location_id)

    cleaned_title = (title or "").strip()
    if not cleaned_title:
        raise ValueError("title is required")
    if len(cleaned_title) > 256:
        raise ValueError("title must be at most 256 characters")

    cleaned_description = (description or "").strip()

    from_at = _ensure_aware(available_from)
    until_at = _ensure_aware(available_until)
    if until_at <= from_at:
        raise ValueError("available_until must be after available_from")

    now = _now()
    if until_at <= now:
        raise ValueError("available_until must be in the future")

    if price is not None and price < 0:
        raise ValueError("price cannot be negative")

    # Lazy-close any expired open rows first so they do not block a new offer.
    existing_open = (
        session.query(PickupOffer)
        .filter(
            PickupOffer.location_id == location_id,
            PickupOffer.status == PICKUP_OFFER_STATUS_OPEN,
        )
        .all()
    )
    for row in existing_open:
        _maybe_lazy_close(session, row, now)

    still_open = (
        session.query(PickupOffer)
        .filter(
            PickupOffer.location_id == location_id,
            PickupOffer.status == PICKUP_OFFER_STATUS_OPEN,
        )
        .count()
    )
    if still_open > 0:
        raise ValueError("An open pickup offer already exists for this location")

    offer = PickupOffer(
        location_id=location_id,
        title=cleaned_title,
        description=cleaned_description,
        status=PICKUP_OFFER_STATUS_OPEN,
        available_from=from_at,
        available_until=until_at,
        price=price,
    )
    session.add(offer)
    session.flush()
    return _to_view(offer, location_name=_location_name(session, location_id), now=now)


def close_pickup_offer(session: Session, *, offer_id: int, location_id: int) -> PickupOfferView:
    require_active_pickup_offer(session, location_id)
    offer = session.get(PickupOffer, offer_id)
    if offer is None or int(offer.location_id) != int(location_id):
        raise ValueError("Pickup offer not found")
    if offer.status != PICKUP_OFFER_STATUS_OPEN:
        raise ValueError("Pickup offer is not open")
    offer.status = PICKUP_OFFER_STATUS_CLOSED
    session.flush()
    return _to_view(offer, location_name=_location_name(session, location_id))


def list_pickup_offers_for_location(session: Session, location_id: int) -> list[PickupOfferView]:
    rows = (
        session.query(PickupOffer)
        .filter(PickupOffer.location_id == location_id)
        .order_by(PickupOffer.created_at.desc(), PickupOffer.id.desc())
        .all()
    )
    now = _now()
    name = _location_name(session, location_id)
    views: list[PickupOfferView] = []
    for row in rows:
        _maybe_lazy_close(session, row, now)
        views.append(_to_view(row, location_name=name, now=now))
    return views


def get_live_pickup_offer_for_location(
    session: Session,
    location_id: int,
) -> PickupOfferView | None:
    rows = (
        session.query(PickupOffer)
        .filter(
            PickupOffer.location_id == location_id,
            PickupOffer.status == PICKUP_OFFER_STATUS_OPEN,
        )
        .order_by(PickupOffer.created_at.desc(), PickupOffer.id.desc())
        .all()
    )
    now = _now()
    name = _location_name(session, location_id)
    for row in rows:
        _maybe_lazy_close(session, row, now)
        if is_offer_live(row, now):
            return _to_view(row, location_name=name, now=now)
    return None


def location_ids_with_live_pickup_offers(
    session: Session,
    location_ids: list[int],
) -> set[int]:
    """Return subset of location_ids that currently have a live open offer."""
    if not location_ids:
        return set()
    now = _now()
    rows = (
        session.query(PickupOffer)
        .filter(
            PickupOffer.location_id.in_(location_ids),
            PickupOffer.status == PICKUP_OFFER_STATUS_OPEN,
            PickupOffer.available_from <= now,
            PickupOffer.available_until > now,
        )
        .all()
    )
    return {int(row.location_id) for row in rows}
