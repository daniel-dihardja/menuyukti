"""API adapter tool GraphQL CRUD and auth."""

from __future__ import annotations

import asyncio

from graphql.data_sources import (
    ApiAdapterTool,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_user"

LIST_TOOLS = """
query ApiAdapterTools($workspaceId: ID!) {
  apiAdapterTools(workspaceId: $workspaceId) {
    id
    workspaceId
    toolKey
    name
    description
    url
    isActive
  }
}
"""

MY_WORKSPACE_WITH_TOOLS = """
query MyWorkspaceWithApiAdapterTools {
  myWorkspace {
    id
    apiAdapterTools {
      id
      toolKey
      name
    }
  }
}
"""

CREATE_TOOL = """
mutation CreateApiAdapterTool($workspaceId: ID!, $name: String!, $description: String!, $url: String!) {
  createApiAdapterTool(workspaceId: $workspaceId, name: $name, description: $description, url: $url) {
    id
    toolKey
    name
    url
  }
}
"""

UPDATE_TOOL = """
mutation UpdateApiAdapterTool($id: ID!, $name: String, $url: String) {
  updateApiAdapterTool(id: $id, name: $name, url: $url) {
    id
    toolKey
    name
    url
  }
}
"""

DELETE_TOOL = """
mutation DeleteApiAdapterTool($id: ID!) {
  deleteApiAdapterTool(id: $id)
}
"""


def _seed_workspace_with_member() -> int:
    session = SessionLocal()
    try:
        session.query(ApiAdapterTool).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        ws = Workspace(name="Test WS", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(ws)
        session.commit()
        session.refresh(ws)
        mem = WorkspaceMembership(
            workspace_id=ws.id,
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            role="owner",
        )
        session.add(mem)
        session.commit()
        return ws.id
    finally:
        session.close()


def test_api_adapter_tools_crud_and_list():
    wid = _seed_workspace_with_member()
    ctx = graphql_auth_context()

    r1 = asyncio.run(
        schema.execute(
            CREATE_TOOL,
            variable_values={
                "workspaceId": str(wid),
                "name": "My POS Feed",
                "description": "Fetches daily sales JSON from our edge API.",
                "url": "https://api.example.com/v1/sales",
            },
            context_value=ctx,
        )
    )
    assert not r1.errors, r1.errors
    created = r1.data["createApiAdapterTool"]
    assert created["toolKey"] == "my_pos_feed"
    assert created["name"] == "My POS Feed"
    tid = created["id"]

    r_list = asyncio.run(
        schema.execute(
            LIST_TOOLS,
            variable_values={"workspaceId": str(wid)},
            context_value=ctx,
        )
    )
    assert not r_list.errors, r_list.errors
    items = r_list.data["apiAdapterTools"]
    assert len(items) == 1
    assert items[0]["id"] == tid

    r_nested = asyncio.run(
        schema.execute(MY_WORKSPACE_WITH_TOOLS, context_value=ctx),
    )
    assert not r_nested.errors, r_nested.errors
    mw = r_nested.data["myWorkspace"]
    assert mw["id"] == str(wid)
    nested_items = mw["apiAdapterTools"]
    assert len(nested_items) == 1
    assert nested_items[0]["id"] == tid
    assert nested_items[0]["toolKey"] == "my_pos_feed"

    r_up = asyncio.run(
        schema.execute(
            UPDATE_TOOL,
            variable_values={
                "id": tid,
                "name": "Renamed Feed",
                "url": "https://api.example.com/v2/sales",
            },
            context_value=ctx,
        )
    )
    assert not r_up.errors, r_up.errors
    assert r_up.data["updateApiAdapterTool"]["toolKey"] == "renamed_feed"

    r_del = asyncio.run(
        schema.execute(
            DELETE_TOOL,
            variable_values={"id": tid},
            context_value=ctx,
        )
    )
    assert not r_del.errors, r_del.errors
    assert r_del.data["deleteApiAdapterTool"] is True

    r_empty = asyncio.run(
        schema.execute(
            LIST_TOOLS,
            variable_values={"workspaceId": str(wid)},
            context_value=ctx,
        )
    )
    assert not r_empty.errors, r_empty.errors
    assert r_empty.data["apiAdapterTools"] == []


def test_api_adapter_tools_non_member_empty_list_and_denied_create():
    wid = _seed_workspace_with_member()

    r_list = asyncio.run(
        schema.execute(
            LIST_TOOLS,
            variable_values={"workspaceId": str(wid)},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert not r_list.errors, r_list.errors
    assert r_list.data["apiAdapterTools"] == []

    r_create = asyncio.run(
        schema.execute(
            CREATE_TOOL,
            variable_values={
                "workspaceId": str(wid),
                "name": "Hack",
                "description": "x",
                "url": "https://evil.example.com/",
            },
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert r_create.errors
    assert "Access denied" in str(r_create.errors[0].message)


def test_create_api_adapter_tool_rejects_http_url():
    wid = _seed_workspace_with_member()

    r = asyncio.run(
        schema.execute(
            CREATE_TOOL,
            variable_values={
                "workspaceId": str(wid),
                "name": "Bad",
                "description": "Uses http",
                "url": "http://insecure.example.com/data",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert r.errors
    assert "https" in str(r.errors[0].message).lower()


def test_create_duplicate_name_rejected():
    wid = _seed_workspace_with_member()
    ctx = graphql_auth_context()
    vars_base = {
        "workspaceId": str(wid),
        "name": "Same Name",
        "description": "First",
        "url": "https://a.example.com/1",
    }
    r1 = asyncio.run(
        schema.execute(CREATE_TOOL, variable_values=vars_base, context_value=ctx)
    )
    assert not r1.errors, r1.errors

    r2 = asyncio.run(
        schema.execute(
            CREATE_TOOL,
            variable_values={
                **vars_base,
                "description": "Second",
                "url": "https://b.example.com/2",
            },
            context_value=ctx,
        )
    )
    assert r2.errors
    assert "already exists" in str(r2.errors[0].message)


def test_create_rejects_overlong_url():
    wid = _seed_workspace_with_member()
    long_url = "https://example.com/" + "x" * 2100
    r = asyncio.run(
        schema.execute(
            CREATE_TOOL,
            variable_values={
                "workspaceId": str(wid),
                "name": "Long URL Tool",
                "description": "x",
                "url": long_url,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert r.errors
    assert "2048" in str(r.errors[0].message) or "characters" in str(r.errors[0].message).lower()
