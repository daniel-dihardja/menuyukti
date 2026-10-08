"""Point earn rules: query, upsert, subscription gate."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import (
    Location,
    PointEarnRule,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.services.point_earn_rules import (
    ACTION_KEY_COMPLETE_ORDER,
    ACTION_KEY_OPEN_MENU_QR,
)
from graphql.services.service_subscriptions import SERVICE_KEY_POINT_SYSTEM
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

ACTIVATE = """
mutation Activate($locationId: Int!, $serviceKey: String!) {
  activateServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
    id
    serviceKey
    status
  }
}
"""

UPSERT = """
mutation UpsertRules($locationId: Int!, $rules: [PointEarnRuleInput!]!) {
  upsertPointEarnRules(locationId: $locationId, rules: $rules) {
    actionKey
    points
    enabled
  }
}
"""

QUERY = """
query Rules($locationId: Int!) {
  pointEarnRules(locationId: $locationId) {
    actionKey
    points
    enabled
  }
}
"""

OTHER_USER = "clerk_other_user_points"


def _clear(session) -> None:
    session.query(PointEarnRule).filter(
        PointEarnRule.location_id.in_(
            session.query(Location.id).filter(
                Location.clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
            )
        )
    ).delete(synchronize_session=False)
    from graphql.data_sources.models.service_subscription import ServiceSubscription

    session.query(ServiceSubscription).filter(
        ServiceSubscription.workspace_id.in_(
            session.query(Workspace.id).filter(
                Workspace.owner_clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
            )
        )
    ).delete(synchronize_session=False)
    session.query(Location).filter(
        Location.clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
    ).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
    ).delete()
    session.query(Workspace).filter(
        Workspace.owner_clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
    ).delete()
    session.commit()


@pytest.fixture
def points_location():
    session = SessionLocal()
    try:
        _clear(session)
        ws = Workspace(
            name="Points WS",
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
            name="Points Loc",
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


def _activate_point_system(location_id: int) -> None:
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={
                "locationId": location_id,
                "serviceKey": SERVICE_KEY_POINT_SYSTEM,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None


def test_query_defaults_after_subscription(points_location):
    lid = points_location["location_id"]
    empty = asyncio.run(
        schema.execute(
            QUERY,
            variable_values={"locationId": lid},
            context_value=graphql_auth_context(),
        )
    )
    assert empty.errors is None
    assert empty.data["pointEarnRules"] == []

    _activate_point_system(lid)
    listed = asyncio.run(
        schema.execute(
            QUERY,
            variable_values={"locationId": lid},
            context_value=graphql_auth_context(),
        )
    )
    assert listed.errors is None
    rows = listed.data["pointEarnRules"]
    assert len(rows) == 2
    by_key = {r["actionKey"]: r for r in rows}
    assert by_key[ACTION_KEY_OPEN_MENU_QR] == {
        "actionKey": ACTION_KEY_OPEN_MENU_QR,
        "points": 10,
        "enabled": False,
    }
    assert by_key[ACTION_KEY_COMPLETE_ORDER] == {
        "actionKey": ACTION_KEY_COMPLETE_ORDER,
        "points": 0,
        "enabled": False,
    }


def test_upsert_and_query(points_location):
    lid = points_location["location_id"]
    _activate_point_system(lid)
    result = asyncio.run(
        schema.execute(
            UPSERT,
            variable_values={
                "locationId": lid,
                "rules": [
                    {
                        "actionKey": ACTION_KEY_OPEN_MENU_QR,
                        "points": 10,
                        "enabled": True,
                    },
                    {
                        "actionKey": ACTION_KEY_COMPLETE_ORDER,
                        "points": 25,
                        "enabled": False,
                    },
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None
    by_key = {r["actionKey"]: r for r in result.data["upsertPointEarnRules"]}
    assert by_key[ACTION_KEY_OPEN_MENU_QR]["enabled"] is True
    assert by_key[ACTION_KEY_OPEN_MENU_QR]["points"] == 10
    assert by_key[ACTION_KEY_COMPLETE_ORDER]["points"] == 25

    listed = asyncio.run(
        schema.execute(
            QUERY,
            variable_values={"locationId": lid},
            context_value=graphql_auth_context(),
        )
    )
    assert listed.errors is None
    again = {r["actionKey"]: r for r in listed.data["pointEarnRules"]}
    assert again[ACTION_KEY_OPEN_MENU_QR]["enabled"] is True
    assert again[ACTION_KEY_COMPLETE_ORDER]["points"] == 25


def test_upsert_rejects_without_subscription(points_location):
    lid = points_location["location_id"]
    result = asyncio.run(
        schema.execute(
            UPSERT,
            variable_values={
                "locationId": lid,
                "rules": [
                    {
                        "actionKey": ACTION_KEY_OPEN_MENU_QR,
                        "points": 10,
                        "enabled": True,
                    }
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("point_system subscription" in str(e) for e in result.errors)


def test_upsert_rejects_unknown_action(points_location):
    lid = points_location["location_id"]
    _activate_point_system(lid)
    result = asyncio.run(
        schema.execute(
            UPSERT,
            variable_values={
                "locationId": lid,
                "rules": [{"actionKey": "not_a_real_action", "points": 1, "enabled": True}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("Invalid point earn action key" in str(e) for e in result.errors)


def test_upsert_denied_for_non_owner(points_location):
    lid = points_location["location_id"]
    _activate_point_system(lid)
    result = asyncio.run(
        schema.execute(
            UPSERT,
            variable_values={
                "locationId": lid,
                "rules": [
                    {
                        "actionKey": ACTION_KEY_OPEN_MENU_QR,
                        "points": 10,
                        "enabled": True,
                    }
                ],
            },
            context_value={"user_id": OTHER_USER},
        )
    )
    assert result.errors
    assert any("Access denied" in str(e) for e in result.errors)
