"""Location-scoped service subscription entitlements (no Stripe yet)."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from graphql.data_sources.models.location import Location
from graphql.data_sources.models.menu import Menu
from graphql.data_sources.models.service_subscription import ServiceSubscription

SERVICE_KEY_DIGITAL_MENU = "digital_menu"
SERVICE_KEY_POINT_SYSTEM = "point_system"
SERVICE_KEY_STAMP_CARD = "stamp_card"
SERVICE_KEY_CASHBACK = "cashback"
SERVICE_KEY_PREDICTION = "prediction"

KNOWN_SERVICE_KEYS = frozenset(
    {
        SERVICE_KEY_DIGITAL_MENU,
        SERVICE_KEY_POINT_SYSTEM,
        SERVICE_KEY_STAMP_CARD,
        SERVICE_KEY_CASHBACK,
        SERVICE_KEY_PREDICTION,
    }
)

SERVICE_STATUS_ACTIVE = "active"
SERVICE_STATUS_CANCELED = "canceled"
KNOWN_SERVICE_STATUSES = frozenset({SERVICE_STATUS_ACTIVE, SERVICE_STATUS_CANCELED})


def normalize_service_key(service_key: str | None) -> str:
    value = (service_key or "").strip().lower()
    if value not in KNOWN_SERVICE_KEYS:
        raise ValueError(
            f"Invalid service key: {service_key!r}. Expected one of {sorted(KNOWN_SERVICE_KEYS)}."
        )
    return value


def is_active_subscription(session: Session, location_id: int, service_key: str) -> bool:
    key = normalize_service_key(service_key)
    row = (
        session.query(ServiceSubscription)
        .filter(
            ServiceSubscription.location_id == location_id,
            ServiceSubscription.service_key == key,
            ServiceSubscription.status == SERVICE_STATUS_ACTIVE,
        )
        .one_or_none()
    )
    return row is not None


def get_subscription(
    session: Session,
    location_id: int,
    service_key: str,
) -> ServiceSubscription | None:
    key = normalize_service_key(service_key)
    return (
        session.query(ServiceSubscription)
        .filter(
            ServiceSubscription.location_id == location_id,
            ServiceSubscription.service_key == key,
        )
        .one_or_none()
    )


def activate_subscription(
    session: Session,
    *,
    location: Location,
    service_key: str,
) -> ServiceSubscription:
    """Upsert an active subscription for the location. Requires ``location.workspace_id``."""
    key = normalize_service_key(service_key)
    if location.workspace_id is None:
        raise ValueError("Location must belong to a workspace to subscribe to services")

    row = get_subscription(session, location.id, key)
    if row is None:
        row = ServiceSubscription(
            workspace_id=location.workspace_id,
            location_id=location.id,
            service_key=key,
            status=SERVICE_STATUS_ACTIVE,
            canceled_at=None,
        )
        session.add(row)
    else:
        row.workspace_id = location.workspace_id
        row.status = SERVICE_STATUS_ACTIVE
        row.canceled_at = None

    session.flush()
    return row


def _unpublish_digital_menu(session: Session, location_id: int) -> None:
    menu = session.query(Menu).filter(Menu.location_id == location_id).one_or_none()
    if menu is not None and menu.public_enabled:
        menu.public_enabled = False


def cancel_subscription(
    session: Session,
    *,
    location: Location,
    service_key: str,
) -> ServiceSubscription:
    """Cancel the subscription; unpublish digital menu when canceling that service."""
    key = normalize_service_key(service_key)
    row = get_subscription(session, location.id, key)
    if row is None:
        if location.workspace_id is None:
            raise ValueError("Location must belong to a workspace to subscribe to services")
        row = ServiceSubscription(
            workspace_id=location.workspace_id,
            location_id=location.id,
            service_key=key,
            status=SERVICE_STATUS_CANCELED,
            canceled_at=datetime.now(UTC),
        )
        session.add(row)
    else:
        row.status = SERVICE_STATUS_CANCELED
        row.canceled_at = datetime.now(UTC)

    if key == SERVICE_KEY_DIGITAL_MENU:
        _unpublish_digital_menu(session, location.id)

    session.flush()
    return row
