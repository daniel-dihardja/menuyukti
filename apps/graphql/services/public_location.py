"""Public (unauthenticated) location hub resolution."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources import Workspace
from graphql.data_sources.models.location import Location
from graphql.data_sources.models.menu import Menu, MenuItem
from graphql.data_sources.models.prediction import PREDICTION_STATUS_OPEN, Prediction
from graphql.data_sources.models.voting import VOTING_STATUS_OPEN, Voting
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PICK_AND_WIN,
    SERVICE_KEY_VOTING,
    is_active_subscription,
)

HREF_SEGMENT_MENU = "menu"
HREF_SEGMENT_PICK_AND_WIN = "pick-and-win"
HREF_SEGMENT_VOTING = "voting"


@dataclass(frozen=True, slots=True)
class PublicLocationServiceView:
    key: str
    href_segment: str
    available: bool


@dataclass(frozen=True, slots=True)
class PublicLocationPredictionTeaserView:
    question: str
    open_count: int


@dataclass(frozen=True, slots=True)
class PublicLocationVotingTeaserView:
    question: str
    open_count: int


@dataclass(frozen=True, slots=True)
class PublicLocationView:
    id: int
    name: str
    public_slug: str
    services: list[PublicLocationServiceView]
    header_image_filename: str | None
    workspace_id: str | None
    media_owner_clerk_user_id: str | None
    menu_dish_count: int | None
    prediction_teaser: PublicLocationPredictionTeaserView | None
    voting_teaser: PublicLocationVotingTeaserView | None


def _menu_dish_count(session: Session, menu_id: int) -> int:
    return int(
        session.scalar(
            select(func.count())
            .select_from(MenuItem)
            .where(MenuItem.menu_id == menu_id, MenuItem.is_available.is_(True))
        )
        or 0
    )


def _prediction_teaser(
    session: Session, location_id: int
) -> PublicLocationPredictionTeaserView | None:
    rows = session.scalars(
        select(Prediction)
        .where(
            Prediction.location_id == location_id,
            Prediction.status == PREDICTION_STATUS_OPEN,
        )
        .order_by(Prediction.closes_at.asc(), Prediction.id.asc())
    ).all()
    if not rows:
        return None
    return PublicLocationPredictionTeaserView(
        question=rows[0].question,
        open_count=len(rows),
    )


def _voting_teaser(
    session: Session, location_id: int
) -> PublicLocationVotingTeaserView | None:
    rows = session.scalars(
        select(Voting)
        .where(
            Voting.location_id == location_id,
            Voting.status == VOTING_STATUS_OPEN,
        )
        .order_by(Voting.closes_at.asc(), Voting.id.asc())
    ).all()
    if not rows:
        return None
    return PublicLocationVotingTeaserView(
        question=rows[0].question,
        open_count=len(rows),
    )


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
    prediction_available = is_active_subscription(session, int(location.id), SERVICE_KEY_PICK_AND_WIN)
    voting_available = is_active_subscription(session, int(location.id), SERVICE_KEY_VOTING)

    header_image_filename: str | None = None
    workspace_id: str | None = None
    media_owner: str | None = None
    menu_dish_count: int | None = None

    if menu_available and menu is not None:
        header_image_filename = menu.header_image_filename
        menu_dish_count = _menu_dish_count(session, int(menu.id))
        media_owner = location.clerk_user_id
        if location.workspace_id is not None:
            workspace_id = str(location.workspace_id)
            workspace = session.get(Workspace, location.workspace_id)
            if workspace is not None:
                media_owner = workspace.owner_clerk_user_id

    prediction_teaser: PublicLocationPredictionTeaserView | None = None
    if prediction_available:
        prediction_teaser = _prediction_teaser(session, int(location.id))

    voting_teaser: PublicLocationVotingTeaserView | None = None
    if voting_available:
        voting_teaser = _voting_teaser(session, int(location.id))

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
                key=SERVICE_KEY_PICK_AND_WIN,
                href_segment=HREF_SEGMENT_PICK_AND_WIN,
                available=prediction_available,
            ),
            PublicLocationServiceView(
                key=SERVICE_KEY_VOTING,
                href_segment=HREF_SEGMENT_VOTING,
                available=voting_available,
            ),
        ],
        header_image_filename=header_image_filename,
        workspace_id=workspace_id,
        media_owner_clerk_user_id=media_owner,
        menu_dish_count=menu_dish_count,
        prediction_teaser=prediction_teaser,
        voting_teaser=voting_teaser,
    )
