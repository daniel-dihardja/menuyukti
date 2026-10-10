"""Voting service: create, vote, close, points rewards."""

from __future__ import annotations

import asyncio

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
    SERVICE_KEY_VOTING,
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
mutation CreatePred($input: CreateVotingInput!) {
  createVoting(input: $input) {
    id
    question
    status
    rewardMode
    pointsForVote
    pointsForCorrect
    options { id label sortOrder }
    voteCount
  }
}
"""

VOTE = """
mutation Vote($votingId: Int!, $optionId: Int!) {
  voteVoting(votingId: $votingId, optionId: $optionId) {
    id
    voteCount
    myVote { optionId }
    status
  }
}
"""


CLOSE = """
mutation Close($votingId: Int!) {
  closeVoting(votingId: $votingId) {
    id
    status
  }
}
"""

LIST = """
query Votings($locationId: Int!) {
  votings(locationId: $locationId) {
    id
    question
    status
  }
}
"""

MY_OPEN = """
query MyOpen {
  myOpenVotings {
    id
    question
    locationId
    status
    winningOptionId
    resolvedAt
    voteCount
    myVote { optionId }
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
    from graphql.data_sources.models.voting import (
        Voting,
        VotingOption,
        VotingVote,
    )

    session.query(VotingVote).delete(synchronize_session=False)
    session.query(Voting).update(
        {Voting.winning_option_id: None},
        synchronize_session=False,
    )
    session.query(VotingOption).delete(synchronize_session=False)
    session.query(Voting).delete(synchronize_session=False)
    session.query(PosOrder).filter(PosOrder.opened_by_clerk_user_id.in_([GUEST_A, GUEST_B])).delete(
        synchronize_session=False
    )
    session.query(ServiceSubscription).filter(
        ServiceSubscription.location_id.in_(
            session.query(Location.id).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID)
        )
    ).delete(synchronize_session=False)
    session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.query(Workspace).filter(Workspace.owner_clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
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


def _activate_voting(location_id: int) -> None:
    """Voting requires Point System first."""
    _activate(location_id, SERVICE_KEY_POINT_SYSTEM)
    _activate(location_id, SERVICE_KEY_VOTING)


def _touch_guest(location_id: int, clerk_user_id: str) -> None:
    """Guest becomes eligible for myOpenVotings via a POS order touch."""
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
                    "options": ["Home", "Away"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "voting subscription" in str(result.errors[0]).lower()


def test_create_vote_close(pred_venue):
    lid = pred_venue["location_id"]
    _activate_voting(lid)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Tonight's winner?",
                    "options": ["Team A", "Team B"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors
    pred = created.data["createVoting"]
    assert pred["status"] == "open"
    assert len(pred["options"]) == 2
    option_a = pred["options"][0]["id"]
    option_b = pred["options"][1]["id"]
    pred_id = pred["id"]

    vote = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_a},
            context_value={"user_id": GUEST_A},
        )
    )
    assert vote.errors is None, vote.errors
    assert vote.data["voteVoting"]["voteCount"] == 1
    assert vote.data["voteVoting"]["myVote"]["optionId"] == option_a

    dup = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_b},
            context_value={"user_id": GUEST_A},
        )
    )
    assert dup.errors is not None

    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_b},
            context_value={"user_id": GUEST_B},
        )
    )

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"votingId": pred_id},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors
    assert closed.data["closeVoting"]["status"] == "closed"

    session = SessionLocal()
    try:
        entries = (
            session.query(PointLedgerEntry)
            .filter(PointLedgerEntry.clerk_user_id.in_([GUEST_A, GUEST_B]))
            .all()
        )
        assert len(entries) == 2
        assert {int(e.amount) for e in entries} == {10}
    finally:
        session.close()


def test_activate_voting_requires_point_system(pred_venue):
    lid = pred_venue["location_id"]
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_VOTING},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "point_system" in str(result.errors[0]).lower()


def test_create_requires_point_system(pred_venue):
    lid = pred_venue["location_id"]
    _activate(lid, SERVICE_KEY_POINT_SYSTEM)
    _activate(lid, SERVICE_KEY_VOTING)
    # Cancel points after voting is on — create must still require points.
    from graphql.data_sources import Location
    from graphql.services.service_subscriptions import cancel_subscription

    session = SessionLocal()
    try:
        location = session.get(Location, lid)
        cancel_subscription(session, location=location, service_key=SERVICE_KEY_POINT_SYSTEM)
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Score?",
                    "options": ["Over", "Under"],
                    "rewardMode": "points",
                    "pointsForVote": 20,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "point_system" in str(result.errors[0]).lower()


def test_rejects_social_reward_mode(pred_venue):
    lid = pred_venue["location_id"]
    _activate_voting(lid)
    result = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Social?",
                    "options": ["A", "B"],
                    "rewardMode": "social",
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "points" in str(result.errors[0]).lower()


def test_points_mode_awards_on_vote(pred_venue):
    lid = pred_venue["location_id"]
    _activate_voting(lid)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Next goal?",
                    "options": ["Home", "Away"],
                    "rewardMode": "points",
                    "pointsForVote": 5,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors
    pred = created.data["createVoting"]
    pred_id = pred["id"]
    option_home = pred["options"][0]["id"]
    option_away = pred["options"][1]["id"]

    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_home},
            context_value={"user_id": GUEST_A},
        )
    )
    asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_away},
            context_value={"user_id": GUEST_B},
        )
    )

    bal_a = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_A}))
    bal_b = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_B}))
    assert bal_a.errors is None, bal_a.errors
    assert bal_b.errors is None, bal_b.errors
    assert bal_a.data["myPointBalances"][0]["balance"] == 5
    assert bal_b.data["myPointBalances"][0]["balance"] == 5


def test_vote_award_soft_skip_without_point_system(pred_venue):
    """If Points was on at create but canceled before vote, vote award soft no-ops."""
    lid = pred_venue["location_id"]
    _activate_voting(lid)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Soft skip?",
                    "options": ["Yes", "No"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred = created.data["createVoting"]
    pred_id = pred["id"]
    option_yes = pred["options"][0]["id"]

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

    vote = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_yes},
            context_value={"user_id": GUEST_A},
        )
    )
    assert vote.errors is None, vote.errors

    bal = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_A}))
    assert bal.data["myPointBalances"] == []


def test_my_open_votings_scoped_to_touched_locations(pred_venue):
    lid = pred_venue["location_id"]
    _activate_voting(lid)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Visible after visit?",
                    "options": ["Y", "N"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred_id = created.data["createVoting"]["id"]

    empty = asyncio.run(schema.execute(MY_OPEN, context_value={"user_id": GUEST_A}))
    assert empty.errors is None, empty.errors
    assert empty.data["myOpenVotings"] == []

    _touch_guest(lid, GUEST_A)
    opened = asyncio.run(schema.execute(MY_OPEN, context_value={"user_id": GUEST_A}))
    assert opened.errors is None, opened.errors
    assert len(opened.data["myOpenVotings"]) == 1
    assert opened.data["myOpenVotings"][0]["id"] == pred_id


def test_close_then_cannot_vote(pred_venue):
    lid = pred_venue["location_id"]
    _activate_voting(lid)
    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Closed?",
                    "options": ["A", "B"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred_id = created.data["createVoting"]["id"]
    option_id = created.data["createVoting"]["options"][0]["id"]

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"votingId": pred_id},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors
    assert closed.data["closeVoting"]["status"] == "closed"

    vote = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_id},
            context_value={"user_id": GUEST_A},
        )
    )
    assert vote.errors is not None


def test_owner_list(pred_venue):
    lid = pred_venue["location_id"]
    _activate_voting(lid)
    asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "List me",
                    "options": ["1", "2"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
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
    assert len(listed.data["votings"]) == 1


def test_guest_home_hides_closed_votings(pred_venue):
    """After the owner closes a vote, it disappears from guest home."""
    lid = pred_venue["location_id"]
    _activate_voting(lid)
    _touch_guest(lid, GUEST_A)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "question": "Gone when closed?",
                    "options": ["Yes", "No"],
                    "rewardMode": "points",
                    "pointsForVote": 10,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    pred_id = created.data["createVoting"]["id"]
    option_yes = created.data["createVoting"]["options"][0]["id"]

    vote_a = asyncio.run(
        schema.execute(
            VOTE,
            variable_values={"votingId": pred_id, "optionId": option_yes},
            context_value={"user_id": GUEST_A},
        )
    )
    assert vote_a.errors is None, vote_a.errors

    home_open = asyncio.run(schema.execute(MY_OPEN, context_value={"user_id": GUEST_A}))
    assert home_open.errors is None, home_open.errors
    assert len(home_open.data["myOpenVotings"]) == 1
    assert home_open.data["myOpenVotings"][0]["myVote"]["optionId"] == option_yes

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"votingId": pred_id},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors

    home_after = asyncio.run(schema.execute(MY_OPEN, context_value={"user_id": GUEST_A}))
    assert home_after.errors is None, home_after.errors
    assert home_after.data["myOpenVotings"] == []
