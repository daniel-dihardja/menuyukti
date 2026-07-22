"""Tests for Instagram item CRUD."""

from __future__ import annotations

import asyncio

from graphql.data_sources import InstagramItem, Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_NODE = """
mutation CreateNode($locationId: Int!, $nodeType: String!, $name: String, $parentId: ID) {
  createNode(locationId: $locationId, nodeType: $nodeType, name: $name, parentId: $parentId) {
    id
  }
}
"""

CREATE_ITEM = """
mutation CreateInstagramItem($workflowId: ID!, $kind: String!, $title: String) {
  createInstagramItem(workflowId: $workflowId, kind: $kind, title: $title) {
    id
    workflowId
    locationId
    kind
    title
    status
    caption
    hook
    visualBrief
  }
}
"""

LIST_ITEMS = """
query InstagramItems($workflowId: ID!) {
  instagramItems(workflowId: $workflowId) {
    id
    kind
    title
    status
  }
}
"""

GET_ITEM = """
query InstagramItem($id: ID!) {
  instagramItem(id: $id) {
    id
    kind
    title
    caption
    hook
    visualBrief
    status
  }
}
"""

UPDATE_ITEM = """
mutation UpdateInstagramItem(
  $id: ID!
  $kind: String
  $title: String
  $caption: String
  $hook: String
  $visualBrief: String
  $status: String
) {
  updateInstagramItem(
    id: $id
    kind: $kind
    title: $title
    caption: $caption
    hook: $hook
    visualBrief: $visualBrief
    status: $status
  ) {
    id
    kind
    title
    caption
    hook
    visualBrief
    status
  }
}
"""

DELETE_ITEM = """
mutation DeleteInstagramItem($id: ID!) {
  deleteInstagramItem(id: $id)
}
"""


def _cleanup() -> None:
    session = SessionLocal()
    try:
        session.query(InstagramItem).delete()
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()
    finally:
        session.close()


def _create_workflow() -> tuple[int, str]:
    _cleanup()
    session = SessionLocal()
    try:
        location = Location(name="IG items location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    wf = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not wf.errors, wf.errors
    return location_id, wf.data["createNode"]["id"]


def test_create_list_update_delete_instagram_item() -> None:
    location_id, workflow_id = _create_workflow()

    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={
                "workflowId": workflow_id,
                "kind": "story",
                "title": "Lunch special",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item = created.data["createInstagramItem"]
    assert item["kind"] == "story"
    assert item["title"] == "Lunch special"
    assert item["status"] == "draft"
    assert item["workflowId"] == workflow_id
    assert item["locationId"] == location_id
    item_id = item["id"]

    listed = asyncio.run(
        schema.execute(
            LIST_ITEMS,
            variable_values={"workflowId": workflow_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    assert len(listed.data["instagramItems"]) == 1
    assert listed.data["instagramItems"][0]["id"] == item_id

    updated = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "kind": "reel",
                "title": "Updated title",
                "caption": "Try our bowl",
                "hook": "15s sizzle",
                "visualBrief": "Overhead pour shot",
                "status": "ready",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    body = updated.data["updateInstagramItem"]
    assert body["kind"] == "reel"
    assert body["title"] == "Updated title"
    assert body["caption"] == "Try our bowl"
    assert body["hook"] == "15s sizzle"
    assert body["visualBrief"] == "Overhead pour shot"
    assert body["status"] == "ready"

    fetched = asyncio.run(
        schema.execute(
            GET_ITEM,
            variable_values={"id": item_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not fetched.errors, fetched.errors
    assert fetched.data["instagramItem"]["title"] == "Updated title"

    deleted = asyncio.run(
        schema.execute(
            DELETE_ITEM,
            variable_values={"id": item_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteInstagramItem"] is True

    listed_after = asyncio.run(
        schema.execute(
            LIST_ITEMS,
            variable_values={"workflowId": workflow_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not listed_after.errors, listed_after.errors
    assert listed_after.data["instagramItems"] == []


def test_create_instagram_item_requires_auth() -> None:
    _location_id, workflow_id = _create_workflow()
    result = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post"},
            context_value={},
        )
    )
    assert result.errors
    assert "Missing authenticated user" in str(result.errors[0])


def test_instagram_items_unauthorized_returns_empty() -> None:
    _location_id, workflow_id = _create_workflow()
    asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post", "title": "A"},
            context_value=graphql_auth_context(),
        )
    )
    listed = asyncio.run(
        schema.execute(
            LIST_ITEMS,
            variable_values={"workflowId": workflow_id},
            context_value={"user_id": "someone-else"},
        )
    )
    assert not listed.errors, listed.errors
    assert listed.data["instagramItems"] == []


def test_create_instagram_item_rejects_invalid_kind() -> None:
    _location_id, workflow_id = _create_workflow()
    result = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "carousel"},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "kind must be one of" in str(result.errors[0])
