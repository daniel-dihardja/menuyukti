"""Public (unauthenticated) location hub resolution."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources.models.location import Location
from graphql.data_sources.models.menu import Menu
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PREDICTION,
    is_active_subscription,
)

HREF_SEGMENT_MENU = "menu"
HREF_SEGMENT_PREDICTION = "prediction"


@dataclass(frozen=True, slots=True)
class PublicLocationServiceView:
    key: str
    href_segment: str
    available: bool


@dataclass(frozen=True, slots=True)
class PublicLocationView:
    id: int
    name: str
    public_slug: str
    services: list[PublicLocationServiceView]


def get_public_location(session: Session, slug: str) -> PublicLocationView | None:
    cleaned = (slug or "").strip().lower()
    if not cleaned:
        return None

    location = session.scalars(
        select(Location).options(selectinload(Location.menu)).where(Location.public_slug == cleaned)
    ).one_or_none()
    if location is None or not location.public_slug:
        return None

    menu: Menu | None = location.menu
    menu_available = bool(
        menu is not None
        and menu.public_enabled
        and is_active_subscription(session, int(location.id), SERVICE_KEY_DIGITAL_MENU)
    )
    prediction_available = is_active_subscription(session, int(location.id), SERVICE_KEY_PREDICTION)

    return PublicLocationView(
        id=int(location.id),
        name=location.name,
        public_slug=str(location.public_slug),
        services=[
            PublicLocationServiceView(
                key=SERVICE_KEY_DIGITAL_MENU,
                href_segment=HREF_SEGMENT_MENU,
                available=menu_available,
            ),
            PublicLocationServiceView(
                key=SERVICE_KEY_PREDICTION,
                href_segment=HREF_SEGMENT_PREDICTION,
                available=prediction_available,
            ),
        ],
    )
