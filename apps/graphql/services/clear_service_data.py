"""Staff clear of location-scoped service domain data for a Clerk user's workspace."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from graphql.data_sources.models.location import Location
from graphql.data_sources.models.menu import MenuCategory
from graphql.data_sources.models.point_earn_rule import PointEarnRule
from graphql.data_sources.models.point_ledger_entry import PointLedgerEntry
from graphql.data_sources.models.pos_order import (
    PosOrder,
    PosOrderLine,
    PosOrderLineModifier,
)
from graphql.data_sources.models.prediction import (
    Prediction,
    PredictionOutcome,
    PredictionVote,
)
from graphql.data_sources.models.voting import (
    Voting,
    VotingOutcome,
    VotingVote,
)
from graphql.data_sources.models.workspace import Workspace, WorkspaceMembership
from graphql.services.menu import get_menu_for_location, replace_menu_categories
from graphql.services.predictions import (
    ACTION_KEY_PREDICTION_CORRECT,
    ACTION_KEY_PREDICTION_VOTE,
)
from graphql.services.service_subscriptions import (
    KNOWN_SERVICE_KEYS,
    SERVICE_KEY_CASHBACK,
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PICK_AND_WIN,
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_KEY_STAMP_CARD,
    SERVICE_KEY_VOTING,
    normalize_service_key,
)
from graphql.services.votings import (
    ACTION_KEY_VOTING_CORRECT,
    ACTION_KEY_VOTING_VOTE,
)

PREDICTION_LEDGER_ACTION_KEYS = frozenset(
    {
        ACTION_KEY_PREDICTION_VOTE,
        ACTION_KEY_PREDICTION_CORRECT,
    }
)

VOTING_LEDGER_ACTION_KEYS = frozenset(
    {
        ACTION_KEY_VOTING_VOTE,
        ACTION_KEY_VOTING_CORRECT,
    }
)


@dataclass
class ClearServiceDataResult:
    service_key: str
    clerk_user_id: str
    workspace_id: int
    location_ids: list[int] = field(default_factory=list)
    predictions_deleted: int = 0
    votings_deleted: int = 0
    ledger_entries_deleted: int = 0
    earn_rules_deleted: int = 0
    pos_orders_deleted: int = 0
    menu_categories_cleared: int = 0
    notes: list[str] = field(default_factory=list)


def resolve_workspace_for_clerk_user(session: Session, clerk_user_id: str) -> Workspace:
    """Find workspace owned by or accepted-membership for ``clerk_user_id``. Does not create."""
    target = (clerk_user_id or "").strip()
    if not target:
        raise ValueError("targetClerkUserId is required")

    workspace = (
        session.query(Workspace)
        .filter(Workspace.owner_clerk_user_id == target)
        .order_by(Workspace.id.asc())
        .first()
    )
    if workspace is None:
        membership = (
            session.query(WorkspaceMembership)
            .filter(
                WorkspaceMembership.clerk_user_id == target,
                WorkspaceMembership.accepted_at.is_not(None),
            )
            .order_by(WorkspaceMembership.id.asc())
            .first()
        )
        if membership is not None:
            workspace = session.get(Workspace, membership.workspace_id)

    if workspace is None:
        raise ValueError(f"No workspace found for Clerk user {target!r}")
    return workspace


def list_workspace_location_ids(session: Session, workspace_id: int) -> list[int]:
    rows = (
        session.query(Location.id)
        .filter(Location.workspace_id == workspace_id)
        .order_by(Location.id.asc())
        .all()
    )
    return [int(row[0]) for row in rows]


def _clear_pick_and_win(
    session: Session, location_ids: list[int], result: ClearServiceDataResult
) -> None:
    if not location_ids:
        return

    ledger_deleted = (
        session.query(PointLedgerEntry)
        .filter(
            PointLedgerEntry.location_id.in_(location_ids),
            PointLedgerEntry.action_key.in_(PREDICTION_LEDGER_ACTION_KEYS),
        )
        .delete(synchronize_session=False)
    )
    result.ledger_entries_deleted += int(ledger_deleted or 0)

    prediction_ids = [
        int(row[0])
        for row in session.query(Prediction.id)
        .filter(Prediction.location_id.in_(location_ids))
        .all()
    ]
    if not prediction_ids:
        return

    session.query(PredictionVote).filter(PredictionVote.prediction_id.in_(prediction_ids)).delete(
        synchronize_session=False
    )
    session.query(Prediction).filter(Prediction.id.in_(prediction_ids)).update(
        {Prediction.winning_outcome_id: None},
        synchronize_session=False,
    )
    session.flush()
    session.query(PredictionOutcome).filter(
        PredictionOutcome.prediction_id.in_(prediction_ids)
    ).delete(synchronize_session=False)
    deleted = (
        session.query(Prediction)
        .filter(Prediction.id.in_(prediction_ids))
        .delete(synchronize_session=False)
    )
    result.predictions_deleted += int(deleted or 0)


def _clear_voting(
    session: Session, location_ids: list[int], result: ClearServiceDataResult
) -> None:
    if not location_ids:
        return

    ledger_deleted = (
        session.query(PointLedgerEntry)
        .filter(
            PointLedgerEntry.location_id.in_(location_ids),
            PointLedgerEntry.action_key.in_(VOTING_LEDGER_ACTION_KEYS),
        )
        .delete(synchronize_session=False)
    )
    result.ledger_entries_deleted += int(ledger_deleted or 0)

    voting_ids = [
        int(row[0])
        for row in session.query(Voting.id).filter(Voting.location_id.in_(location_ids)).all()
    ]
    if not voting_ids:
        return

    session.query(VotingVote).filter(VotingVote.voting_id.in_(voting_ids)).delete(
        synchronize_session=False
    )
    session.query(Voting).filter(Voting.id.in_(voting_ids)).update(
        {Voting.winning_outcome_id: None},
        synchronize_session=False,
    )
    session.flush()
    session.query(VotingOutcome).filter(VotingOutcome.voting_id.in_(voting_ids)).delete(
        synchronize_session=False
    )
    deleted = (
        session.query(Voting).filter(Voting.id.in_(voting_ids)).delete(synchronize_session=False)
    )
    result.votings_deleted += int(deleted or 0)


def _clear_point_system(
    session: Session, location_ids: list[int], result: ClearServiceDataResult
) -> None:
    if not location_ids:
        return

    ledger_deleted = (
        session.query(PointLedgerEntry)
        .filter(PointLedgerEntry.location_id.in_(location_ids))
        .delete(synchronize_session=False)
    )
    result.ledger_entries_deleted += int(ledger_deleted or 0)

    rules_deleted = (
        session.query(PointEarnRule)
        .filter(PointEarnRule.location_id.in_(location_ids))
        .delete(synchronize_session=False)
    )
    result.earn_rules_deleted += int(rules_deleted or 0)


def _clear_digital_menu(
    session: Session, location_ids: list[int], result: ClearServiceDataResult
) -> None:
    if not location_ids:
        return

    order_ids = [
        int(row[0])
        for row in session.query(PosOrder.id).filter(PosOrder.location_id.in_(location_ids)).all()
    ]
    if order_ids:
        line_ids = [
            int(row[0])
            for row in session.query(PosOrderLine.id)
            .filter(PosOrderLine.pos_order_id.in_(order_ids))
            .all()
        ]
        if line_ids:
            session.query(PosOrderLineModifier).filter(
                PosOrderLineModifier.pos_order_line_id.in_(line_ids)
            ).delete(synchronize_session=False)
            session.query(PosOrderLine).filter(PosOrderLine.id.in_(line_ids)).delete(
                synchronize_session=False
            )
        pos_deleted = (
            session.query(PosOrder)
            .filter(PosOrder.id.in_(order_ids))
            .delete(synchronize_session=False)
        )
        result.pos_orders_deleted += int(pos_deleted or 0)
    session.flush()
    session.expire_all()

    categories_cleared = 0
    for location_id in location_ids:
        menu = get_menu_for_location(session, location_id)
        if menu is None:
            continue
        before = session.query(MenuCategory).filter(MenuCategory.menu_id == menu.id).count()
        replace_menu_categories(session, menu, [])
        session.flush()
        after = session.query(MenuCategory).filter(MenuCategory.menu_id == menu.id).count()
        categories_cleared += max(0, before - after)
    result.menu_categories_cleared += categories_cleared


def _clear_stamp_card(
    session: Session, location_ids: list[int], result: ClearServiceDataResult
) -> None:
    del session, location_ids
    result.notes.append("stamp_card has no domain data yet; nothing cleared")


def _clear_cashback(
    session: Session, location_ids: list[int], result: ClearServiceDataResult
) -> None:
    del session, location_ids, result
    raise ValueError(
        "cashback data is workspace CRM-scoped, not location service tables. "
        "Use CRM staff tools (e.g. deleteCrmApp) instead."
    )


_CLEAR_HANDLERS: dict[str, Callable[[Session, list[int], ClearServiceDataResult], None]] = {
    SERVICE_KEY_PICK_AND_WIN: _clear_pick_and_win,
    SERVICE_KEY_VOTING: _clear_voting,
    SERVICE_KEY_POINT_SYSTEM: _clear_point_system,
    SERVICE_KEY_DIGITAL_MENU: _clear_digital_menu,
    SERVICE_KEY_STAMP_CARD: _clear_stamp_card,
    SERVICE_KEY_CASHBACK: _clear_cashback,
}


def clear_workspace_service_data(
    session: Session,
    *,
    clerk_user_id: str,
    service_key: str,
) -> ClearServiceDataResult:
    """Clear domain data for ``service_key`` across all locations in the user's workspace.

    Does not cancel ``service_subscription`` rows or delete locations/workspace.
    Caller commits.
    """
    key = normalize_service_key(service_key)
    if key not in _CLEAR_HANDLERS:
        raise ValueError(
            f"Clear is not implemented for service key {key!r}. "
            f"Expected one of {sorted(KNOWN_SERVICE_KEYS)}."
        )

    workspace = resolve_workspace_for_clerk_user(session, clerk_user_id)
    location_ids = list_workspace_location_ids(session, workspace.id)
    result = ClearServiceDataResult(
        service_key=key,
        clerk_user_id=(clerk_user_id or "").strip(),
        workspace_id=workspace.id,
        location_ids=location_ids,
    )

    handler = _CLEAR_HANDLERS[key]
    handler(session, location_ids, result)
    session.flush()
    return result
