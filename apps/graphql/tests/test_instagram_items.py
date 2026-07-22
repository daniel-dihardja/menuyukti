"""Tests for Instagram item CRUD."""

from __future__ import annotations

import asyncio

from graphql.data_sources import (
    InstagramItem,
    InstagramItemMediaVersion,
    Location,
    Node,
    SessionLocal,
)
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
mutation CreateInstagramItem(
  $workflowId: ID!
  $kind: String!
  $title: String
  $caption: String
  $hook: String
  $visualBrief: String
  $status: String
  $schedule: DateTime
) {
  createInstagramItem(
    workflowId: $workflowId
    kind: $kind
    title: $title
    caption: $caption
    hook: $hook
    visualBrief: $visualBrief
    status: $status
    schedule: $schedule
  ) {
    id
    workflowId
    locationId
    kind
    title
    status
    caption
    hook
    visualBrief
    schedule
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
    schedule
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
    schedule
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
  $mediaS3Key: String
  $generationPrompt: String
  $referenceImages: [InstagramItemReferenceImageInput!]
  $styleId: Int
  $status: String
  $schedule: DateTime
) {
  updateInstagramItem(
    id: $id
    kind: $kind
    title: $title
    caption: $caption
    hook: $hook
    visualBrief: $visualBrief
    mediaS3Key: $mediaS3Key
    generationPrompt: $generationPrompt
    referenceImages: $referenceImages
    styleId: $styleId
    status: $status
    schedule: $schedule
  ) {
    id
    kind
    title
    caption
    hook
    visualBrief
    mediaS3Key
    generationPrompt
    referenceImages {
      name
      enabled
    }
    mediaVersions {
      id
      mediaS3Key
      prompt
      createdAt
    }
    styleId
    status
    schedule
  }
}
"""

VALID_MEDIA_KEY = (
    f"users/{GRAPHQL_TEST_USER_ID}/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
)
VALID_MEDIA_KEY_2 = (
    f"users/{GRAPHQL_TEST_USER_ID}/posts/bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
)
VALID_PHOTO_NAME = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"

DELETE_ITEM = """
mutation DeleteInstagramItem($id: ID!) {
  deleteInstagramItem(id: $id)
}
"""

DELETE_ITEM_MEDIA_VERSION = """
mutation DeleteInstagramItemMediaVersion($itemId: ID!, $mediaS3Key: String!) {
  deleteInstagramItemMediaVersion(itemId: $itemId, mediaS3Key: $mediaS3Key) {
    id
    mediaS3Key
    mediaVersions {
      id
      mediaS3Key
      prompt
      createdAt
    }
  }
}
"""


def _cleanup() -> None:
    session = SessionLocal()
    try:
        session.query(InstagramItemMediaVersion).delete()
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
    assert item["schedule"] is None
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
                "schedule": "2026-07-22T18:30:00+00:00",
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
    assert body["schedule"] is not None
    assert "2026-07-22" in body["schedule"]

    fetched = asyncio.run(
        schema.execute(
            GET_ITEM,
            variable_values={"id": item_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not fetched.errors, fetched.errors
    assert fetched.data["instagramItem"]["title"] == "Updated title"
    assert fetched.data["instagramItem"]["schedule"] is not None

    cleared = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "schedule": None},
            context_value=graphql_auth_context(),
        )
    )
    assert not cleared.errors, cleared.errors
    assert cleared.data["updateInstagramItem"]["schedule"] is None

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


def test_create_instagram_item_with_schedule() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={
                "workflowId": workflow_id,
                "kind": "post",
                "title": "Scheduled post",
                "schedule": "2026-08-01T12:00:00+00:00",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item = created.data["createInstagramItem"]
    assert item["schedule"] is not None
    assert "2026-08-01" in item["schedule"]


def test_create_instagram_item_with_content_fields() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={
                "workflowId": workflow_id,
                "kind": "reel",
                "title": "Friday special",
                "caption": "Save the date",
                "hook": "Open with sizzle",
                "visualBrief": "Close-up of bowl",
                "status": "ready",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item = created.data["createInstagramItem"]
    assert item["kind"] == "reel"
    assert item["title"] == "Friday special"
    assert item["caption"] == "Save the date"
    assert item["hook"] == "Open with sizzle"
    assert item["visualBrief"] == "Close-up of bowl"
    assert item["status"] == "ready"


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


def test_instagram_items_ordered_by_schedule_ascending() -> None:
    _location_id, workflow_id = _create_workflow()
    later = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={
                "workflowId": workflow_id,
                "kind": "post",
                "title": "Later",
                "schedule": "2026-08-10T12:00:00+00:00",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not later.errors, later.errors
    unscheduled = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={
                "workflowId": workflow_id,
                "kind": "story",
                "title": "No schedule",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not unscheduled.errors, unscheduled.errors
    earlier = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={
                "workflowId": workflow_id,
                "kind": "reel",
                "title": "Earlier",
                "schedule": "2026-08-01T09:00:00+00:00",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not earlier.errors, earlier.errors

    listed = asyncio.run(
        schema.execute(
            LIST_ITEMS,
            variable_values={"workflowId": workflow_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not listed.errors, listed.errors
    titles = [row["title"] for row in listed.data["instagramItems"]]
    assert titles == ["Earlier", "Later", "No schedule"]


def test_update_instagram_item_sets_media_and_prompt() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post", "title": "Media"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "generationPrompt": "Warm lunch bowl on wood table",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    body = updated.data["updateInstagramItem"]
    assert body["mediaS3Key"] == VALID_MEDIA_KEY
    assert body["generationPrompt"] == "Warm lunch bowl on wood table"
    assert len(body["mediaVersions"]) == 1
    assert body["mediaVersions"][0]["mediaS3Key"] == VALID_MEDIA_KEY
    assert body["mediaVersions"][0]["prompt"] == "Warm lunch bowl on wood table"

    cleared = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "mediaS3Key": None, "generationPrompt": None},
            context_value=graphql_auth_context(),
        )
    )
    assert not cleared.errors, cleared.errors
    assert cleared.data["updateInstagramItem"]["mediaS3Key"] is None
    assert cleared.data["updateInstagramItem"]["generationPrompt"] is None
    # Clearing the commit pointer leaves version history intact.
    assert len(cleared.data["updateInstagramItem"]["mediaVersions"]) == 1


def test_update_instagram_item_appends_media_versions() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post", "title": "Versions"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    first = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "generationPrompt": "First prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors

    second = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY_2,
                "generationPrompt": "Second prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not second.errors, second.errors
    body = second.data["updateInstagramItem"]
    assert body["mediaS3Key"] == VALID_MEDIA_KEY_2
    keys = [version["mediaS3Key"] for version in body["mediaVersions"]]
    assert keys == [VALID_MEDIA_KEY_2, VALID_MEDIA_KEY]


def test_update_instagram_item_skips_duplicate_media_version() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "generationPrompt": "Same image",
            },
            context_value=graphql_auth_context(),
        )
    )
    repeat = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "generationPrompt": "Same image again",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not repeat.errors, repeat.errors

    session = SessionLocal()
    try:
        count = (
            session.query(InstagramItemMediaVersion)
            .filter(InstagramItemMediaVersion.instagram_item_id == int(item_id))
            .count()
        )
        assert count == 1
    finally:
        session.close()


def test_update_instagram_item_reselects_existing_media_version() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "generationPrompt": "First prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": VALID_MEDIA_KEY_2,
                "generationPrompt": "Second prompt",
            },
            context_value=graphql_auth_context(),
        )
    )

    reselect = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "mediaS3Key": VALID_MEDIA_KEY},
            context_value=graphql_auth_context(),
        )
    )
    assert not reselect.errors, reselect.errors
    body = reselect.data["updateInstagramItem"]
    assert body["mediaS3Key"] == VALID_MEDIA_KEY
    assert len(body["mediaVersions"]) == 2

    session = SessionLocal()
    try:
        count = (
            session.query(InstagramItemMediaVersion)
            .filter(InstagramItemMediaVersion.instagram_item_id == int(item_id))
            .count()
        )
        assert count == 2
    finally:
        session.close()


def test_delete_instagram_item_media_version_reassigns_pointer() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "story"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "mediaS3Key": VALID_MEDIA_KEY},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "mediaS3Key": VALID_MEDIA_KEY_2},
            context_value=graphql_auth_context(),
        )
    )

    deleted = asyncio.run(
        schema.execute(
            DELETE_ITEM_MEDIA_VERSION,
            variable_values={"itemId": item_id, "mediaS3Key": VALID_MEDIA_KEY_2},
            context_value=graphql_auth_context(),
        )
    )
    assert not deleted.errors, deleted.errors
    body = deleted.data["deleteInstagramItemMediaVersion"]
    assert body["mediaS3Key"] == VALID_MEDIA_KEY
    assert [v["mediaS3Key"] for v in body["mediaVersions"]] == [VALID_MEDIA_KEY]

    cleared = asyncio.run(
        schema.execute(
            DELETE_ITEM_MEDIA_VERSION,
            variable_values={"itemId": item_id, "mediaS3Key": VALID_MEDIA_KEY},
            context_value=graphql_auth_context(),
        )
    )
    assert not cleared.errors, cleared.errors
    cleared_body = cleared.data["deleteInstagramItemMediaVersion"]
    assert cleared_body["mediaS3Key"] is None
    assert cleared_body["mediaVersions"] == []


def test_update_instagram_item_rejects_invalid_media_key() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "story"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    result = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "mediaS3Key": "users/other-user/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "media_s3_key" in str(result.errors[0]).lower()


def test_update_instagram_item_sets_reference_images_and_brief() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "visualBrief": "Bowl on marble with Ref 1",
                "referenceImages": [
                    {"name": VALID_PHOTO_NAME, "enabled": True},
                    {
                        "name": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.jpg",
                        "enabled": False,
                    },
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    body = updated.data["updateInstagramItem"]
    assert body["visualBrief"] == "Bowl on marble with Ref 1"
    assert body["referenceImages"] == [
        {"name": VALID_PHOTO_NAME, "enabled": True},
        {"name": "bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.jpg", "enabled": False},
    ]

    cleared = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "referenceImages": []},
            context_value=graphql_auth_context(),
        )
    )
    assert not cleared.errors, cleared.errors
    assert cleared.data["updateInstagramItem"]["referenceImages"] == []


def test_update_instagram_item_rejects_invalid_reference_image() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "story"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    result = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={
                "id": item_id,
                "referenceImages": [{"name": "not-a-uuid.png", "enabled": True}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "reference image name" in str(result.errors[0]).lower()


_SAMPLE_STYLE_SPEC = {
    "schemaVersion": 2,
    "properties": {
        "headline": {
            "type": "enum",
            "values": ["auto", "none"],
            "default": "auto",
            "instructions": {
                "auto": "Place a short headline when provided.",
                "none": "Leave the headline area empty.",
            },
        },
    },
}


def _ensure_style_for_user() -> int:
    """Create a workspace + visual style owned by the test user; return style id."""
    from datetime import UTC, datetime

    from graphql.data_sources import VisualStyle, Workspace, WorkspaceMembership

    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(name="IG item style workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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
        style = VisualStyle(
            workspace_id=ws.id,
            created_by_clerk_user_id=GRAPHQL_TEST_USER_ID,
            name="IG item style",
            rules="PROPERTIES (resolved):\n- headline: auto → Place a short headline when provided.",
            reference_image_name=VALID_PHOTO_NAME,
            spec=_SAMPLE_STYLE_SPEC,
            is_default=False,
        )
        session.add(style)
        session.commit()
        session.refresh(style)
        return style.id
    finally:
        session.close()


def test_update_instagram_item_sets_and_clears_style_id() -> None:
    _location_id, workflow_id = _create_workflow()
    style_id = _ensure_style_for_user()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "story"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "styleId": style_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    assert updated.data["updateInstagramItem"]["styleId"] == style_id

    cleared = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "styleId": None},
            context_value=graphql_auth_context(),
        )
    )
    assert not cleared.errors, cleared.errors
    assert cleared.data["updateInstagramItem"]["styleId"] is None


def test_update_instagram_item_rejects_unknown_style_id() -> None:
    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    result = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "styleId": 999_999_999},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "style" in str(result.errors[0]).lower()


def test_update_instagram_item_rejects_unauthorized_style() -> None:
    from datetime import UTC, datetime

    from graphql.data_sources import VisualStyle, Workspace, WorkspaceMembership

    _location_id, workflow_id = _create_workflow()
    created = asyncio.run(
        schema.execute(
            CREATE_ITEM,
            variable_values={"workflowId": workflow_id, "kind": "post"},
            context_value=graphql_auth_context(),
        )
    )
    assert not created.errors, created.errors
    item_id = created.data["createInstagramItem"]["id"]

    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(name="Other style workspace", owner_clerk_user_id="clerk_other_style_user")
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id="clerk_other_style_user",
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        style = VisualStyle(
            workspace_id=ws.id,
            created_by_clerk_user_id="clerk_other_style_user",
            name="Forbidden style",
            rules="PROPERTIES (resolved):",
            reference_image_name=VALID_PHOTO_NAME,
            spec=_SAMPLE_STYLE_SPEC,
            is_default=False,
        )
        session.add(style)
        session.commit()
        session.refresh(style)
        foreign_style_id = style.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            UPDATE_ITEM,
            variable_values={"id": item_id, "styleId": foreign_style_id},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    err = str(result.errors[0]).lower()
    assert "style" in err or "not allowed" in err or "permission" in err
