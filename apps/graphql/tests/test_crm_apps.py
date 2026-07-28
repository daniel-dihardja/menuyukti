"""Tests for CRM app queries and create/update/delete mutations."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID

import pytest
from graphql.data_sources import (
    CrmApp,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_LIST_QUERY = """
query CrmApps {
  crmApps {
    id
    appId
    title
    workspaceId
    createdByClerkUserId
  }
}
"""

_ONE_QUERY = """
query CrmApp($id: Int!) {
  crmApp(id: $id) {
    id
    appId
    title
    workspaceId
    createdByClerkUserId
  }
}
"""

_CREATE = """
mutation CreateCrmApp($title: String!) {
  createCrmApp(title: $title) {
    id
    appId
    title
    workspaceId
    createdByClerkUserId
  }
}
"""

_UPDATE = """
mutation UpdateCrmApp($id: Int!, $title: String!) {
  updateCrmApp(id: $id, title: $title) {
    id
    appId
    title
    workspaceId
    createdByClerkUserId
  }
}
"""

_DELETE = """
mutation DeleteCrmApp($id: Int!) {
  deleteCrmApp(id: $id)
}
"""

OTHER_USER_ID = "clerk_other_crm_app_user"


@pytest.fixture
def crm_app_workspace_id():
    session = SessionLocal()
    try:
        session.query(CrmApp).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="CRM App workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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
        session.refresh(ws)
        wid = ws.id
    finally:
        session.close()
    yield wid
    session = SessionLocal()
    try:
        session.query(CrmApp).filter(CrmApp.workspace_id == wid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def test_list_empty_for_member(crm_app_workspace_id: int):
    result = _execute(_LIST_QUERY)
    assert result.errors is None
    assert result.data["crmApps"] == []


def test_list_denied_without_auth(crm_app_workspace_id: int):
    result = _execute(_LIST_QUERY, context_value={})
    assert result.errors is None
    assert result.data["crmApps"] == []


def test_create_and_list(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "  Acme Loyalty  "})
    assert created.errors is None
    app = created.data["createCrmApp"]
    assert app["title"] == "Acme Loyalty"
    assert app["workspaceId"] == crm_app_workspace_id
    assert app["createdByClerkUserId"] == GRAPHQL_TEST_USER_ID
    assert UUID(app["appId"])

    listed = _execute(_LIST_QUERY)
    assert listed.errors is None
    assert len(listed.data["crmApps"]) == 1
    assert listed.data["crmApps"][0]["id"] == app["id"]
    assert listed.data["crmApps"][0]["appId"] == app["appId"]

    one = _execute(_ONE_QUERY, {"id": app["id"]})
    assert one.errors is None
    assert one.data["crmApp"]["title"] == "Acme Loyalty"


def test_update_app(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "Original Title"})
    assert created.errors is None
    app = created.data["createCrmApp"]
    app_id = app["id"]
    public_app_id = app["appId"]

    updated = _execute(_UPDATE, {"id": app_id, "title": "  Renamed App  "})
    assert updated.errors is None
    row = updated.data["updateCrmApp"]
    assert row["id"] == app_id
    assert row["title"] == "Renamed App"
    assert row["appId"] == public_app_id
    assert row["workspaceId"] == crm_app_workspace_id

    one = _execute(_ONE_QUERY, {"id": app_id})
    assert one.errors is None
    assert one.data["crmApp"]["title"] == "Renamed App"


def test_update_rejects_blank_title(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "Keep Me"})
    assert created.errors is None
    app_id = created.data["createCrmApp"]["id"]

    result = _execute(_UPDATE, {"id": app_id, "title": "   "})
    assert result.errors is not None
    assert "title is required" in str(result.errors[0])


def test_non_member_cannot_update(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "Protected App"})
    assert created.errors is None
    app_id = created.data["createCrmApp"]["id"]

    denied = _execute(
        _UPDATE,
        {"id": app_id, "title": "Hijacked"},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is not None
    assert "Not allowed" in str(denied.errors[0])

    one = _execute(_ONE_QUERY, {"id": app_id})
    assert one.errors is None
    assert one.data["crmApp"]["title"] == "Protected App"


def test_delete_app(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "Temp App"})
    assert created.errors is None
    app_id = created.data["createCrmApp"]["id"]

    deleted = _execute(_DELETE, {"id": app_id})
    assert deleted.errors is None
    assert deleted.data["deleteCrmApp"] is True

    listed = _execute(_LIST_QUERY)
    assert listed.errors is None
    assert listed.data["crmApps"] == []

    one = _execute(_ONE_QUERY, {"id": app_id})
    assert one.errors is None
    assert one.data["crmApp"] is None


def test_non_member_cannot_delete(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "Protected App"})
    assert created.errors is None
    app_id = created.data["createCrmApp"]["id"]

    denied = _execute(
        _DELETE,
        {"id": app_id},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is not None
    assert "Not allowed" in str(denied.errors[0])

    listed = _execute(_LIST_QUERY)
    assert listed.errors is None
    assert len(listed.data["crmApps"]) == 1


def test_create_rejects_blank_title(crm_app_workspace_id: int):
    result = _execute(_CREATE, {"title": "   "})
    assert result.errors is not None
    assert "title is required" in str(result.errors[0])


def test_non_member_cannot_see(crm_app_workspace_id: int):
    created = _execute(_CREATE, {"title": "Secret App"})
    assert created.errors is None
    app_id = created.data["createCrmApp"]["id"]

    other = _execute(
        _ONE_QUERY,
        {"id": app_id},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert other.errors is None
    assert other.data["crmApp"] is None

    listed = _execute(
        _LIST_QUERY,
        context_value={"user_id": OTHER_USER_ID},
    )
    assert listed.errors is None
    assert listed.data["crmApps"] == []
