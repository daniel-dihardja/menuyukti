"""Prediction service: create, vote, resolve, points vs social rewards."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from graphql.data_sources import (
    Location,
    PointLedgerEntry,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.pos_order import PosOrder
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_KEY_PREDICTION,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

GUEST_A = "clerk_guest_pred_a"
GUEST_B = "clerk_guest_pred_b"

ACTIVATE = """
mutation Activate($locationId: Int!, $serviceKey: String!) {
  activateServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
    id
    serviceKey
    status
  }
}
"""

CREATE = """
mutation CreatePred($input: CreatePredictionInput!) {
  createPrediction(input: $input) {
    id
    question
    status
    rewardMode
    pointsForVote
    pointsForCorrect
    outcomes { id label sortOrder }
    voteCount
  }
}
"""

VOTE = """
mutation Vote($predictionId: Int!, $outcomeId: Int!) {
  votePrediction(predictionId: $predictionId, outcomeId: $outcomeId) {
    id
    voteCount
    myVote { outcomeId }
    status
  }
}
"""

RESOLVE = """
mutation Resolve($predictionId: Int!, $winningOutcomeId: Int!) {
  resolvePrediction(predictionId: $predictionId, winningOutcomeId: $winningOutcomeId) {
    id
    status
    winningOutcomeId
    resolvedAt
  }
}
"""

CLOSE = """
mutation Close($predictionId: Int!) {
  closePrediction(predictionId: $predictionId) {
    id
    status
  }
}
"""

LIST = """
query Predictions($locationId: Int!) {
  predictions(locationId: $locationId) {
    id
    question
    status
  }
}
"""

MY_OPEN = """
query MyOpen {
  myOpenPredictions {
    id
    question
    locationId
    myVote { outcomeId }
  }
}
"""

BALANCES = """
query MyBalances {
  myPointBalances {
    locationId
    balance
  }
}
"""


def _clear(session) -> None:
    session.query(PointLedgerEntry).filter(
        PointLedgerEntry.clerk_user_id.in_([GUEST_A, GUEST_B, GRAPHQL_TEST_USER_ID])
    ).delete(synchronize_session=False)
    from graphql.data_sources.models.prediction import (
        Prediction,
        PredictionOutcome,
        PredictionVote,
    )

    session.query(PredictionVote).delete(synchronize_session=False)
    session.query(Prediction).update(
        {Prediction.winning_outcome_id: None},
        synchronize_session=False,
    )
    session.query(PredictionOutcome).delete(synchronize_session=False)
    session.query(Prediction).delete(synchronize_session=False)
    session.query(PosOrder).filter(
        PosOrder.opened_by_clerk_user_id.in_([GUEST_A, GUEST_B])
    ).delete(synchronize_session=False)
    session.query(ServiceSubscription).filter(
        ServiceSubscription.location_id.in_(
            session.query(Location.id).filter(
                Location.clerk_user_id == GRAPHQL_TEST_USER_ID
            )
        )
    ).delete(synchronize_session=False)
    session.query(Location).filter(
        Location.clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.query(Workspace).filter(
        Workspace.owner_clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.commit()


@pytest.fixture
def pred_venue():
    session = SessionLocal()
    try:
        _clear(session)
        ws = Workspace(
            name="Pred WS",
            owner_clerk_user_id=GRAPHQL_TEST_USER_ID,
            plan=WORKSPACE_PLAN_PRO,
        )
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
            )
        )
        loc = Location(
            name="Pred Cafe",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
        )
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
    finally:
        session.close()

    yield {"location_id": lid}

    session = SessionLocal()
    try:
        _clear(session)
    finally:
        session.close()


def _activate(location_id: int, service_key: str) -> None:
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": location_id, "serviceKey": service_key},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors


def _closes_at(hours: int = 24) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).isoformat()


def _touch_guest(location_id: int, clerk_user_id: str) -> None:
    """Guest becomes eligible for myOpenPredictions via a POS order touch."""
    session = SessionLocal()
    try:
        session.add(
            PosOrder(
                location_id=location_id,
                status="open",
                bill_number=f"T-{clerk_user_id[-4:]}",
                opened_by_clerk_user_id=clerk_user_id,
                note="digital_menu",
            )
        )
        session.commit()
    finally:
        session.close()


def test_create_requires_subscription(pred_venue):
    lid = pred_venue["location_id"]
    result = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Who wins?",
                    "closesAt": _closes_at(),
                    "outcomes": ["Home", "Away"],
                    "rewardMode": "social",
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "prediction subscription" in str(result.errors[0]).lower()


def test_create_vote_resolve_social(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Tonight's winner?",
                    "closesAt": _closes_at(),
                    "outcomes": ["Team A", "Team B"],
                    "rewardMode": "social",
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors
    pred = created.data["createPrediction"]
    assert pred["status"] == "open"
    assert len(pred["outcomes"]) == 2
    outcome_a = pred["outcomes"][0]["id"]
    outcome_b = pred["outcomes"][1]["id"]
    pred_id = pred["id"]

    vote = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_a},
            context_value={"user_id": GUEST_A},
        )
    )
    assert vote.errors is None, vote.errors
    assert vote.data["votePrediction"]["voteCount"] == 1
    assert vote.data["votePrediction"]["myVote"]["outcomeId"] == outcome_a

    dup = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_b},
            context_value={"user_id": GUEST_A},
        )
    )
    assert dup.errors is not None

    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_b},
            context_value={"user_id": GUEST_B},
        )
    )

    resolved = asyncio.run(
        schema.execute(
            RESOLVE,
            variable_values={
                "predictionId": pred_id,
                "winningOutcomeId": outcome_a,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert resolved.errors is None, resolved.errors
    assert resolved.data["resolvePrediction"]["status"] == "resolved"
    assert resolved.data["resolvePrediction"]["winningOutcomeId"] == outcome_a

    session = SessionLocal()
    try:
        assert (
            session.query(PointLedgerEntry)
            .filter(PointLedgerEntry.clerk_user_id.in_([GUEST_A, GUEST_B]))
            .count()
            == 0
        )
    finally:
        session.close()


def test_points_mode_requires_point_system(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)
    result = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Score?",
                    "closesAt": _closes_at(),
                    "outcomes": ["Over", "Under"],
                    "rewardMode": "points",
                    "pointsForCorrect": 20,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "point_system" in str(result.errors[0]).lower()


def test_points_mode_awards_on_resolve(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)
    _activate(lid, SERVICE_KEY_POINT_SYSTEM)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Next goal?",
                    "closesAt": _closes_at(),
                    "outcomes": ["Home", "Away"],
                    "rewardMode": "points",
                    "pointsForVote": 5,
                    "pointsForCorrect": 25,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors
    pred = created.data["createPrediction"]
    pred_id = pred["id"]
    outcome_home = pred["outcomes"][0]["id"]
    outcome_away = pred["outcomes"][1]["id"]

    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_home},
            context_value={"user_id": GUEST_A},
        )
    )
    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_away},
            context_value={"user_id": GUEST_B},
        )
    )

    asyncio.run(
        schema.execute(
            RESOLVE,
            variable_values={
                "predictionId": pred_id,
                "winningOutcomeId": outcome_home,
            },
            context_value=graphql_auth_context(),
        )
    )

    bal_a = asyncio.run(
        schema.execute(BALANCES, context_value={"user_id": GUEST_A})
    )
    bal_b = asyncio.run(
        schema.execute(BALANCES, context_value={"user_id": GUEST_B})
    )
    assert bal_a.errors is None, bal_a.errors
    assert bal_b.errors is None, bal_b.errors
    assert bal_a.data["myPointBalances"][0]["balance"] == 30  # 5 vote + 25 correct
    assert bal_b.data["myPointBalances"][0]["balance"] == 5  # vote only


def test_points_award_soft_skip_without_point_system_at_resolve(pred_venue):
    """If Points was on at create but canceled before resolve, awards soft no-op."""
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)
    _activate(lid, SERVICE_KEY_POINT_SYSTEM)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Soft skip?",
                    "closesAt": _closes_at(),
                    "outcomes": ["Yes", "No"],
                    "rewardMode": "points",
                    "pointsForCorrect": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred = created.data["createPrediction"]
    pred_id = pred["id"]
    outcome_yes = pred["outcomes"][0]["id"]

    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_yes},
            context_value={"user_id": GUEST_A},
        )
    )

    cancel = """
    mutation Cancel($locationId: Int!, $serviceKey: String!) {
      cancelServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
        status
      }
    }
    """
    asyncio.run(
        schema.execute(
            cancel,
            variable_values={
                "locationId": lid,
                "serviceKey": SERVICE_KEY_POINT_SYSTEM,
            },
            context_value=graphql_auth_context(),
        )
    )

    resolved = asyncio.run(
        schema.execute(
            RESOLVE,
            variable_values={
                "predictionId": pred_id,
                "winningOutcomeId": outcome_yes,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert resolved.errors is None, resolved.errors
    assert resolved.data["resolvePrediction"]["status"] == "resolved"

    bal = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_A}))
    assert bal.data["myPointBalances"] == []


def test_my_open_predictions_scoped_to_touched_locations(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Visible after visit?",
                    "closesAt": _closes_at(),
                    "outcomes": ["Y", "N"],
                    "rewardMode": "social",
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred_id = created.data["createPrediction"]["id"]

    empty = asyncio.run(schema.execute(MY_OPEN, context_value={"user_id": GUEST_A}))
    assert empty.errors is None, empty.errors
    assert empty.data["myOpenPredictions"] == []

    _touch_guest(lid, GUEST_A)
    opened = asyncio.run(schema.execute(MY_OPEN, context_value={"user_id": GUEST_A}))
    assert opened.errors is None, opened.errors
    assert len(opened.data["myOpenPredictions"]) == 1
    assert opened.data["myOpenPredictions"][0]["id"] == pred_id


def test_close_then_cannot_vote(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)
    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Closed?",
                    "closesAt": _closes_at(),
                    "outcomes": ["A", "B"],
                    "rewardMode": "social",
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred_id = created.data["createPrediction"]["id"]
    outcome_id = created.data["createPrediction"]["outcomes"][0]["id"]

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"predictionId": pred_id},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors
    assert closed.data["closePrediction"]["status"] == "closed"

    vote = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"predictionId": pred_id, "outcomeId": outcome_id},
            context_value={"user_id": GUEST_A},
        )
    )
    assert vote.errors is not None


def test_owner_list(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_PREDICTION)
    asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "List me",
                    "closesAt": _closes_at(),
                    "outcomes": ["1", "2"],
                    "rewardMode": "social",
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    listed = asyncio.run(
        schema.execute(
            LIST,
            variable_values={"locationId": lid},
            context_value=graphql_auth_context(),
        )
    )
    assert listed.errors is None, listed.errors
    assert len(listed.data["predictions"]) == 1
