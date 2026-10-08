"""Location-scoped prediction game: create, vote, resolve, optional point awards."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources.models.point_ledger_entry import PointLedgerEntry
from graphql.data_sources.models.pos_order import PosOrder
from graphql.data_sources.models.prediction import (
    KNOWN_REWARD_MODES,
    PREDICTION_STATUS_CLOSED,
    PREDICTION_STATUS_OPEN,
    PREDICTION_STATUS_RESOLVED,
    REWARD_MODE_POINTS,
    Prediction,
    PredictionOutcome,
    PredictionVote,
)
from graphql.data_sources.models.service_subscription import ServiceSubscription
from graphql.services.point_ledger import award_fixed_amount
from graphql.services.service_subscriptions import (
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_KEY_PREDICTION,
    SERVICE_STATUS_ACTIVE,
    is_active_subscription,
)

ACTION_KEY_PREDICTION_VOTE = "prediction_vote"
ACTION_KEY_PREDICTION_CORRECT = "prediction_correct"


@dataclass(frozen=True, slots=True)
class OutcomeView:
    id: int
    label: str
    sort_order: int


@dataclass(frozen=True, slots=True)
class VoteView:
    id: int
    outcome_id: int
    clerk_user_id: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class PredictionView:
    id: int
    location_id: int
    location_name: str
    question: str
    status: str
    closes_at: datetime
    reward_mode: str
    points_for_vote: int
    points_for_correct: int
    winning_outcome_id: int | None
    created_at: datetime
    resolved_at: datetime | None
    outcomes: list[OutcomeView]
    my_vote: VoteView | None
    vote_count: int


def require_active_prediction(session: Session, location_id: int) -> None:
    if not is_active_subscription(session, location_id, SERVICE_KEY_PREDICTION):
        raise ValueError("prediction subscription is required for this location")


def normalize_reward_mode(value: str | None) -> str:
    mode = (value or "").strip().lower()
    if mode not in KNOWN_REWARD_MODES:
        raise ValueError(
            f"Invalid reward_mode: {value!r}. Expected one of {sorted(KNOWN_REWARD_MODES)}."
        )
    return mode


def _now() -> datetime:
    return datetime.now(UTC)


def _maybe_auto_close(session: Session, prediction: Prediction) -> None:
    if prediction.status != PREDICTION_STATUS_OPEN:
        return
    closes = prediction.closes_at
    if closes.tzinfo is None:
        closes = closes.replace(tzinfo=UTC)
    if _now() >= closes:
        prediction.status = PREDICTION_STATUS_CLOSED


def _to_view(
    prediction: Prediction,
    *,
    location_name: str,
    clerk_user_id: str | None = None,
) -> PredictionView:
    my_vote: VoteView | None = None
    if clerk_user_id:
        for vote in prediction.votes:
            if vote.clerk_user_id == clerk_user_id:
                my_vote = VoteView(
                    id=int(vote.id),
                    outcome_id=int(vote.outcome_id),
                    clerk_user_id=vote.clerk_user_id,
                    created_at=vote.created_at,
                )
                break
    return PredictionView(
        id=int(prediction.id),
        location_id=int(prediction.location_id),
        location_name=location_name,
        question=prediction.question,
        status=prediction.status,
        closes_at=prediction.closes_at,
        reward_mode=prediction.reward_mode,
        points_for_vote=int(prediction.points_for_vote),
        points_for_correct=int(prediction.points_for_correct),
        winning_outcome_id=(
            int(prediction.winning_outcome_id)
            if prediction.winning_outcome_id is not None
            else None
        ),
        created_at=prediction.created_at,
        resolved_at=prediction.resolved_at,
        outcomes=[
            OutcomeView(
                id=int(o.id),
                label=o.label,
                sort_order=int(o.sort_order),
            )
            for o in prediction.outcomes
        ],
        my_vote=my_vote,
        vote_count=len(prediction.votes),
    )


def _load_prediction(session: Session, prediction_id: int) -> Prediction | None:
    return session.scalar(
        select(Prediction)
        .where(Prediction.id == prediction_id)
        .options(
            selectinload(Prediction.outcomes),
            selectinload(Prediction.votes),
            selectinload(Prediction.location),
        )
        .execution_options(populate_existing=True)
    )


def list_predictions_for_location(
    session: Session,
    location_id: int,
) -> list[PredictionView]:
    rows = session.scalars(
        select(Prediction)
        .where(Prediction.location_id == location_id)
        .options(
            selectinload(Prediction.outcomes),
            selectinload(Prediction.votes),
            selectinload(Prediction.location),
        )
        .order_by(Prediction.created_at.desc())
    ).all()
    for row in rows:
        _maybe_auto_close(session, row)
    session.flush()
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


def list_open_predictions_for_location(
    session: Session,
    *,
    location_id: int,
    clerk_user_id: str | None = None,
) -> list[PredictionView]:
    """Open predictions at one location when Prediction is active (public venue surface)."""
    if not is_active_subscription(session, location_id, SERVICE_KEY_PREDICTION):
        return []

    user_id = (clerk_user_id or "").strip() or None
    rows = session.scalars(
        select(Prediction)
        .where(
            Prediction.location_id == location_id,
            Prediction.status.in_([PREDICTION_STATUS_OPEN, PREDICTION_STATUS_CLOSED]),
        )
        .options(
            selectinload(Prediction.outcomes),
            selectinload(Prediction.votes),
            selectinload(Prediction.location),
        )
        .order_by(Prediction.closes_at.asc())
    ).all()

    open_views: list[PredictionView] = []
    for row in rows:
        _maybe_auto_close(session, row)
        if row.status != PREDICTION_STATUS_OPEN:
            continue
        open_views.append(
            _to_view(
                row,
                location_name=row.location.name if row.location else "",
                clerk_user_id=user_id,
            )
        )
    session.flush()
    return open_views


def list_open_predictions_for_guest(
    session: Session,
    *,
    clerk_user_id: str,
) -> list[PredictionView]:
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        return []

    location_ids = _guest_touched_location_ids(session, user_id)
    if not location_ids:
        return []

    active_prediction_locations = set(
        session.scalars(
            select(ServiceSubscription.location_id).where(
                ServiceSubscription.location_id.in_(location_ids),
                ServiceSubscription.service_key == SERVICE_KEY_PREDICTION,
                ServiceSubscription.status == SERVICE_STATUS_ACTIVE,
            )
        ).all()
    )
    if not active_prediction_locations:
        return []

    views: list[PredictionView] = []
    for location_id in sorted(int(x) for x in active_prediction_locations):
        views.extend(
            list_open_predictions_for_location(
                session,
                location_id=location_id,
                clerk_user_id=user_id,
            )
        )
    views.sort(key=lambda v: v.closes_at)
    return views


def create_prediction(
    session: Session,
    *,
    location_id: int,
    question: str,
    closes_at: datetime,
    outcome_labels: list[str],
    reward_mode: str,
    points_for_vote: int = 0,
    points_for_correct: int = 0,
) -> PredictionView:
    require_active_prediction(session, location_id)

    q = (question or "").strip()
    if not q:
        raise ValueError("question is required")
    if len(q) > 512:
        raise ValueError("question must be at most 512 characters")

    labels = [(label or "").strip() for label in outcome_labels]
    labels = [label for label in labels if label]
    if len(labels) < 2:
        raise ValueError("At least two outcomes are required")
    if any(len(label) > 256 for label in labels):
        raise ValueError("outcome labels must be at most 256 characters")

    mode = normalize_reward_mode(reward_mode)
    vote_pts = max(0, int(points_for_vote))
    correct_pts = max(0, int(points_for_correct))

    if mode == REWARD_MODE_POINTS:
        if not is_active_subscription(session, location_id, SERVICE_KEY_POINT_SYSTEM):
            raise ValueError("point_system subscription is required when reward_mode is points")
        if correct_pts <= 0 and vote_pts <= 0:
            raise ValueError(
                "points_for_correct or points_for_vote must be > 0 when reward_mode is points"
            )

    closes = closes_at
    if closes.tzinfo is None:
        closes = closes.replace(tzinfo=UTC)
    if closes <= _now():
        raise ValueError("closes_at must be in the future")

    prediction = Prediction(
        location_id=location_id,
        question=q,
        status=PREDICTION_STATUS_OPEN,
        closes_at=closes,
        reward_mode=mode,
        points_for_vote=vote_pts,
        points_for_correct=correct_pts,
    )
    session.add(prediction)
    session.flush()

    for index, label in enumerate(labels):
        session.add(
            PredictionOutcome(
                prediction_id=prediction.id,
                label=label,
                sort_order=index,
            )
        )
    session.flush()

    loaded = _load_prediction(session, int(prediction.id))
    assert loaded is not None
    return _to_view(
        loaded,
        location_name=loaded.location.name if loaded.location else "",
    )


def close_prediction(session: Session, *, prediction_id: int, location_id: int) -> PredictionView:
    require_active_prediction(session, location_id)
    prediction = _load_prediction(session, prediction_id)
    if prediction is None or int(prediction.location_id) != location_id:
        raise ValueError("Prediction not found")
    if prediction.status == PREDICTION_STATUS_RESOLVED:
        raise ValueError("Cannot close a resolved prediction")
    prediction.status = PREDICTION_STATUS_CLOSED
    session.flush()
    return _to_view(
        prediction,
        location_name=prediction.location.name if prediction.location else "",
    )


def vote_prediction(
    session: Session,
    *,
    clerk_user_id: str,
    prediction_id: int,
    outcome_id: int,
) -> PredictionView:
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        raise ValueError("Missing authenticated user for votePrediction")

    prediction = _load_prediction(session, prediction_id)
    if prediction is None:
        raise ValueError("Prediction not found")

    require_active_prediction(session, int(prediction.location_id))
    _maybe_auto_close(session, prediction)
    session.flush()

    if prediction.status != PREDICTION_STATUS_OPEN:
        raise ValueError("Voting is closed for this prediction")

    outcome_ids = {int(o.id) for o in prediction.outcomes}
    if int(outcome_id) not in outcome_ids:
        raise ValueError("outcome_id is not valid for this prediction")

    existing = next(
        (v for v in prediction.votes if v.clerk_user_id == user_id),
        None,
    )
    if existing is not None:
        raise ValueError("You have already voted on this prediction")

    try:
        with session.begin_nested():
            vote = PredictionVote(
                prediction_id=prediction.id,
                clerk_user_id=user_id,
                outcome_id=int(outcome_id),
            )
            session.add(vote)
            session.flush()
    except IntegrityError as exc:
        raise ValueError("You have already voted on this prediction") from exc

    if prediction.reward_mode == REWARD_MODE_POINTS and int(prediction.points_for_vote) > 0:
        award_fixed_amount(
            session,
            clerk_user_id=user_id,
            location_id=int(prediction.location_id),
            amount=int(prediction.points_for_vote),
            action_key=ACTION_KEY_PREDICTION_VOTE,
            source_ref=f"prediction:{prediction.id}:vote",
            label=f"Voted: {prediction.question[:80]}",
        )

    loaded = _load_prediction(session, int(prediction.id))
    assert loaded is not None
    return _to_view(
        loaded,
        location_name=loaded.location.name if loaded.location else "",
        clerk_user_id=user_id,
    )


def resolve_prediction(
    session: Session,
    *,
    prediction_id: int,
    location_id: int,
    winning_outcome_id: int,
) -> PredictionView:
    require_active_prediction(session, location_id)
    prediction = _load_prediction(session, prediction_id)
    if prediction is None or int(prediction.location_id) != location_id:
        raise ValueError("Prediction not found")
    if prediction.status == PREDICTION_STATUS_RESOLVED:
        raise ValueError("Prediction is already resolved")

    outcome_ids = {int(o.id) for o in prediction.outcomes}
    if int(winning_outcome_id) not in outcome_ids:
        raise ValueError("winning_outcome_id is not valid for this prediction")

    prediction.status = PREDICTION_STATUS_RESOLVED
    prediction.winning_outcome_id = int(winning_outcome_id)
    prediction.resolved_at = _now()
    session.flush()

    if prediction.reward_mode == REWARD_MODE_POINTS and int(prediction.points_for_correct) > 0:
        for vote in prediction.votes:
            if int(vote.outcome_id) != int(winning_outcome_id):
                continue
            award_fixed_amount(
                session,
                clerk_user_id=vote.clerk_user_id,
                location_id=location_id,
                amount=int(prediction.points_for_correct),
                action_key=ACTION_KEY_PREDICTION_CORRECT,
                source_ref=f"prediction:{prediction.id}:correct",
                label=f"Correct: {prediction.question[:80]}",
            )

    loaded = _load_prediction(session, int(prediction.id))
    assert loaded is not None
    return _to_view(
        loaded,
        location_name=loaded.location.name if loaded.location else "",
    )
