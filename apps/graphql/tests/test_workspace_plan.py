"""Workspace plan (free/pro): defaults, location cap, update mutation."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
from graphql.data_sources import Location, SessionLocal, Workspace, WorkspaceMembership
from graphql.schema import schema
from graphql.services.workspace_plan import WORKSPACE_PLAN_FREE, WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_WORKSPACE = """
mutation CreateWorkspace($name: String!) {
  createWorkspace(name: $name) {
    id
    name
    plan
  }
}
"""

CREATE_LOCATION = """
mutation CreateLocation($workspaceId: ID!, $name: String!) {
  createLocation(workspaceId: $workspaceId, name: $name) {
    id
    name
  }
}
"""

UPDATE_WORKSPACE_PLAN = """
mutation UpdateWorkspacePlan($workspaceId: ID!, $plan: String!) {
  updateWorkspacePlan(workspaceId: $workspaceId, plan: $plan) {
    id
    plan
  }
}
"""

MY_WORKSPACE = """
query MyWorkspace {
  myWorkspace {
    id
    plan
  }
}
"""


def _clear(session) -> None:
    session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.query(Workspace).filter(Workspace.owner_clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.commit()


@pytest.fixture
def clean_user_workspaces():
    session = SessionLocal()
    try:
        _clear(session)
        yield
    finally:
        _clear(session)
        session.close()


def test_create_workspace_defaults_to_free(clean_user_workspaces):
    result = asyncio.run(
        schema.execute(
            CREATE_WORKSPACE,
            variable_values={"name": "Free shop"},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None
    assert result.data is not None
    assert result.data["createWorkspace"]["plan"] == WORKSPACE_PLAN_FREE


def test_create_location_blocked_on_free(clean_user_workspaces):
    created = asyncio.run(
        schema.execute(
            CREATE_WORKSPACE,
            variable_values={"name": "Guest shop"},
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None
    assert created.data is not None
    wid = created.data["createWorkspace"]["id"]

    first = asyncio.run(
        schema.execute(
            CREATE_LOCATION,
            variable_values={"workspaceId": wid, "name": "One"},
            context_value=graphql_auth_context(),
        )
    )
    assert first.errors is not None
    assert any("Free (guest) plan cannot create locations" in str(e) for e in first.errors)


def test_create_location_second_ok_on_pro(clean_user_workspaces):
    created = asyncio.run(
        schema.execute(
            CREATE_WORKSPACE,
            variable_values={"name": "Pro shop"},
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None
    assert created.data is not None
    wid = created.data["createWorkspace"]["id"]

    upgraded = asyncio.run(
        schema.execute(
            UPDATE_WORKSPACE_PLAN,
            variable_values={"workspaceId": wid, "plan": WORKSPACE_PLAN_PRO},
            context_value=graphql_auth_context(),
        )
    )
    assert upgraded.errors is None
    assert upgraded.data is not None
    assert upgraded.data["updateWorkspacePlan"]["plan"] == WORKSPACE_PLAN_PRO

    first = asyncio.run(
        schema.execute(
            CREATE_LOCATION,
            variable_values={"workspaceId": wid, "name": "One"},
            context_value=graphql_auth_context(),
        )
    )
    assert first.errors is None

    second = asyncio.run(
        schema.execute(
            CREATE_LOCATION,
            variable_values={"workspaceId": wid, "name": "Two"},
            context_value=graphql_auth_context(),
        )
    )
    assert second.errors is None
    assert second.data is not None


def test_update_workspace_plan_and_my_workspace(clean_user_workspaces):
    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(
            name="Existing pro-like",
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
                invited_at=now,
                accepted_at=now,
            )
        )
        session.commit()
        wid = str(ws.id)
    finally:
        session.close()

    mine = asyncio.run(schema.execute(MY_WORKSPACE, context_value=graphql_auth_context()))
    assert mine.errors is None
    assert mine.data is not None
    assert mine.data["myWorkspace"]["plan"] == WORKSPACE_PLAN_PRO

    updated = asyncio.run(
        schema.execute(
            UPDATE_WORKSPACE_PLAN,
            variable_values={"workspaceId": wid, "plan": WORKSPACE_PLAN_FREE},
            context_value=graphql_auth_context(),
        )
    )
    assert updated.errors is None
    assert updated.data is not None
    assert updated.data["updateWorkspacePlan"]["plan"] == WORKSPACE_PLAN_FREE
