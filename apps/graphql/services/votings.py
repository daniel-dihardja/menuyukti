"""Location-scoped voting poll: create, vote, close, points rewards."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources.models.point_ledger_entry import PointLedgerEntry
from graphql.data_sources.models.pos_order import PosOrder
from graphql.data_sources.models.service_subscription import ServiceSubscription
from graphql.data_sources.models.voting import (
    KNOWN_REWARD_MODES,
    REWARD_MODE_POINTS,
    VOTING_STATUS_CLOSED,
    VOTING_STATUS_OPEN,
    VOTING_STATUS_RESOLVED,
    Voting,
    VotingOption,
    VotingVote,
)
from graphql.services.point_ledger import award_fixed_amount
from graphql.services.service_subscriptions import (
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_KEY_VOTING,
    SERVICE_STATUS_ACTIVE,
    is_active_subscription,
)

ACTION_KEY_VOTING_VOTE = "voting_vote"
ACTION_KEY_VOTING_CORRECT = "voting_correct"


@dataclass(frozen=True, slots=True)
class OptionView:
    id: int
    label: str
    sort_order: int


@dataclass(frozen=True, slots=True)
class VoteView:
    id: int
    option_id: int
    clerk_user_id: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class VotingView:
    id: int
    location_id: int
    location_name: str
    question: str
    status: str
    closes_at: datetime | None
    reward_mode: str
    points_for_vote: int
    points_for_correct: int
    winning_option_id: int | None
    created_at: datetime
    resolved_at: datetime | None
    options: list[OptionView]
    my_vote: VoteView | None
    vote_count: int


def require_active_voting(session: Session, location_id: int) -> None:
    if not is_active_subscription(session, location_id, SERVICE_KEY_VOTING):
        raise ValueError("voting subscription is required for this location")


def normalize_reward_mode(value: str | None) -> str:
    mode = (value or "").strip().lower()
    if mode not in KNOWN_REWARD_MODES:
        raise ValueError(
            f"Invalid reward_mode: {value!r}. Expected one of {sorted(KNOWN_REWARD_MODES)}."
        )
    return mode


def _now() -> datetime:
    return datetime.now(UTC)


def _to_view(
    voting: Voting,
    *,
    location_name: str,
    clerk_user_id: str | None = None,
) -> VotingView:
    my_vote: VoteView | None = None
    if clerk_user_id:
        for vote in voting.votes:
            if vote.clerk_user_id == clerk_user_id:
                my_vote = VoteView(
                    id=int(vote.id),
                    option_id=int(vote.option_id),
                    clerk_user_id=vote.clerk_user_id,
                    created_at=vote.created_at,
                )
                break
    return VotingView(
        id=int(voting.id),
        location_id=int(voting.location_id),
        location_name=location_name,
        question=voting.question,
        status=voting.status,
        closes_at=voting.closes_at,
        reward_mode=voting.reward_mode,
        points_for_vote=int(voting.points_for_vote),
        points_for_correct=int(voting.points_for_correct),
        winning_option_id=(
            int(voting.winning_option_id) if voting.winning_option_id is not None else None
        ),
        created_at=voting.created_at,
        resolved_at=voting.resolved_at,
        options=[
            OptionView(
                id=int(o.id),
                label=o.label,
                sort_order=int(o.sort_order),
            )
            for o in voting.options
        ],
        my_vote=my_vote,
        vote_count=len(voting.votes),
    )


def _load_voting(session: Session, voting_id: int) -> Voting | None:
    return session.scalar(
        select(Voting)
        .where(Voting.id == voting_id)
        .options(
            selectinload(Voting.options),
            selectinload(Voting.votes),
            selectinload(Voting.location),
        )
        .execution_options(populate_existing=True)
    )


def list_votings_for_location(
    session: Session,
    location_id: int,
) -> list[VotingView]:
    rows = session.scalars(
        select(Voting)
        .where(Voting.location_id == location_id)
        .options(
            selectinload(Voting.options),
            selectinload(Voting.votes),
            selectinload(Voting.location),
        )
        .order_by(Voting.created_at.desc())
    ).all()
    return [_to_view(row, location_name=row.location.name if row.location else "") for row in rows]


def _guest_touched_location_ids(session: Session, clerk_user_id: str) -> set[int]:
    from_ledger = set(
        session.scalars(
            select(PointLedgerEntry.location_id).where(
                PointLedgerEntry.clerk_user_id == clerk_user_id
            )
        ).all()
    )
    from_orders = set(
        session.scalars(
            select(PosOrder.location_id).where(PosOrder.opened_by_clerk_user_id == clerk_user_id)
        ).all()
    )
    return {int(x) for x in (from_ledger | from_orders)}


def _sort_guest_voting_views(views: list[VotingView]) -> list[VotingView]:
    """Newest open votings first."""

    def key(view: VotingView) -> float:
        created = view.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=UTC)
        return -created.timestamp()

    return sorted(views, key=key)


def _load_open_votings_for_location(
    session: Session,
    *,
    location_id: int,
) -> list[Voting]:
    return list(
        session.scalars(
            select(Voting)
            .where(
                Voting.location_id == location_id,
                Voting.status == VOTING_STATUS_OPEN,
            )
            .options(
                selectinload(Voting.options),
                selectinload(Voting.votes),
                selectinload(Voting.location),
            )
            .order_by(Voting.created_at.desc())
        ).all()
    )


def list_open_votings_for_location(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str | None = None,
) -> list[VotingView]:
    """Guest-visible open votings at one location (public venue surface).

    Closed votings are hidden from guests.
    """
    if not is_active_subscription(session, location_id, SERVICE_KEY_VOTING):
        return []

    user_id = (clerk_user_id or "").strip() or None
    rows = _load_open_votings_for_location(session, location_id=location_id)
    return _sort_guest_voting_views(
        [
            _to_view(
                row,
                location_name=row.location.name if row.location else "",
                clerk_user_id=user_id,
            )
            for row in rows
        ]
    )


def list_open_votings_for_guest(
    session: Session,
    *,
    clerk_user_id: str,
) -> list[VotingView]:
    """Guest home: open votings at touched venues with an active Voting subscription.

    Closed votings are hidden from guests.
    """
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        return []

    location_ids = _guest_touched_location_ids(session, user_id)
    if not location_ids:
        return []

    active_voting_locations = set(
        session.scalars(
            select(ServiceSubscription.location_id).where(
                ServiceSubscription.location_id.in_(location_ids),
                ServiceSubscription.service_key == SERVICE_KEY_VOTING,
                ServiceSubscription.status == SERVICE_STATUS_ACTIVE,
            )
        ).all()
    )
    if not active_voting_locations:
        return []

    views: list[VotingView] = []
    for location_id in sorted(int(x) for x in active_voting_locations):
        rows = _load_open_votings_for_location(session, location_id=location_id)
        for row in rows:
            views.append(
                _to_view(
                    row,
                    location_name=row.location.name if row.location else "",
                    clerk_user_id=user_id,
                )
            )
    return _sort_guest_voting_views(views)


def create_voting(
    session: Session,
    *,
    location_id: int,
    question: str,
    option_labels: list[str],
    reward_mode: str,
    points_for_vote: int = 0,
) -> VotingView:
    require_active_voting(session, location_id)

    q = (question or "").strip()
    if not q:
        raise ValueError("question is required")
    if len(q) > 512:
        raise ValueError("question must be at most 512 characters")

    labels = [(label or "").strip() for label in option_labels]
    labels = [label for label in labels if label]
    if len(labels) < 2:
        raise ValueError("At least two options are required")
    if any(len(label) > 256 for label in labels):
        raise ValueError("option labels must be at most 256 characters")

    mode = normalize_reward_mode(reward_mode)
    if mode != REWARD_MODE_POINTS:
        raise ValueError("voting only supports reward_mode=points")
    vote_pts = max(0, int(points_for_vote))

    if not is_active_subscription(session, location_id, SERVICE_KEY_POINT_SYSTEM):
        raise ValueError("point_system subscription is required for voting")
    if vote_pts <= 0:
        raise ValueError("points_for_vote must be > 0")

    voting = Voting(
        location_id=location_id,
        question=q,
        status=VOTING_STATUS_OPEN,
        closes_at=None,
        reward_mode=mode,
        points_for_vote=vote_pts,
        points_for_correct=0,
    )
    session.add(voting)
    session.flush()

    for index, label in enumerate(labels):
        session.add(
            VotingOption(
                voting_id=voting.id,
                label=label,
                sort_order=index,
            )
        )
    session.flush()

    loaded = _load_voting(session, int(voting.id))
    assert loaded is not None
    return _to_view(
        loaded,
        location_name=loaded.location.name if loaded.location else "",
    )


def close_voting(session: Session, *, voting_id: int, location_id: int) -> VotingView:
    require_active_voting(session, location_id)
    voting = _load_voting(session, voting_id)
    if voting is None or int(voting.location_id) != location_id:
        raise ValueError("Voting not found")
    if voting.status == VOTING_STATUS_RESOLVED:
        raise ValueError("Cannot close a resolved voting")
    voting.status = VOTING_STATUS_CLOSED
    session.flush()
    return _to_view(
        voting,
        location_name=voting.location.name if voting.location else "",
    )


def vote_voting(
    session: Session,
    *,
    clerk_user_id: str,
    voting_id: int,
    option_id: int,
) -> VotingView:
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        raise ValueError("Missing authenticated user for voteVoting")

    voting = _load_voting(session, voting_id)
    if voting is None:
        raise ValueError("Voting not found")

    require_active_voting(session, int(voting.location_id))

    if voting.status != VOTING_STATUS_OPEN:
        raise ValueError("Voting is closed for this voting")

    option_ids = {int(o.id) for o in voting.options}
    if int(option_id) not in option_ids:
        raise ValueError("option_id is not valid for this voting")

    existing = next(
        (v for v in voting.votes if v.clerk_user_id == user_id),
        None,
    )
    if existing is not None:
        raise ValueError("You have already voted on this voting")

    try:
        with session.begin_nested():
            vote = VotingVote(
                voting_id=voting.id,
                clerk_user_id=user_id,
                option_id=int(option_id),
            )
            session.add(vote)
            session.flush()
    except IntegrityError as exc:
        raise ValueError("You have already voted on this voting") from exc

    if voting.reward_mode == REWARD_MODE_POINTS and int(voting.points_for_vote) > 0:
        award_fixed_amount(
            session,
            clerk_user_id=user_id,
            location_id=int(voting.location_id),
            amount=int(voting.points_for_vote),
            action_key=ACTION_KEY_VOTING_VOTE,
            source_ref=f"voting:{voting.id}:vote",
            label=f"Voted: {voting.question[:80]}",
        )

    loaded = _load_voting(session, int(voting.id))
    assert loaded is not None
    return _to_view(
        loaded,
        location_name=loaded.location.name if loaded.location else "",
        clerk_user_id=user_id,
    )
