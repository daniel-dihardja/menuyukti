"""Tests for media assets and collections queries/mutations."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
from graphql.data_sources import (
    MediaAsset,
    MediaCollection,
    MediaCollectionMember,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_PHOTO = "11111111-1111-1111-1111-111111111111.webp"
_PHOTO_B = "22222222-2222-2222-2222-222222222222.jpg"

_LIST_COLLECTIONS = """
query MediaCollections {
  mediaCollections {
    id
    workspaceId
    name
    memberCount
  }
}
"""

_LIST_ASSETS = """
query MediaAssets($collectionId: Int) {
  mediaAssets(collectionId: $collectionId) {
    id
    filename
    displayName
  }
}
"""

_CREATE_COLLECTION = """
mutation CreateMediaCollection($name: String!) {
  createMediaCollection(name: $name) {
    id
    name
    memberCount
  }
}
"""

_ENSURE_ASSET = """
mutation EnsureMediaAsset($filename: String!, $displayName: String) {
  ensureMediaAsset(filename: $filename, displayName: $displayName) {
    id
    filename
    displayName
  }
}
"""

_ADD = """
mutation AddMediaToCollection($collectionId: Int!, $filename: String!) {
  addMediaToCollection(collectionId: $collectionId, filename: $filename) {
    id
    memberCount
    members { filename }
  }
}
"""

_REMOVE = """
mutation RemoveMediaFromCollection($collectionId: Int!, $filename: String!) {
  removeMediaFromCollection(collectionId: $collectionId, filename: $filename) {
    id
    memberCount
    members { filename }
  }
}
"""

_DELETE_ASSET = """
mutation DeleteMediaAsset($filename: String!) {
  deleteMediaAsset(filename: $filename)
}
"""

_DELETE_COLLECTION = """
mutation DeleteMediaCollection($id: Int!) {
  deleteMediaCollection(id: $id)
}
"""


@pytest.fixture
def media_workspace_id():
    session = SessionLocal()
    try:
        session.query(MediaCollectionMember).delete()
        session.query(MediaCollection).delete()
        session.query(MediaAsset).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Media collections workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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
        session.query(MediaCollectionMember).delete()
        session.query(MediaCollection).filter(MediaCollection.workspace_id == wid).delete()
        session.query(MediaAsset).filter(MediaAsset.workspace_id == wid).delete()
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


def test_list_empty(media_workspace_id: int):
    result = _execute(_LIST_COLLECTIONS)
    assert result.errors is None
    assert result.data["mediaCollections"] == []
    assets = _execute(_LIST_ASSETS)
    assert assets.errors is None
    assert assets.data["mediaAssets"] == []


def test_ensure_create_add_filter_delete(media_workspace_id: int):
    ensured = _execute(_ENSURE_ASSET, {"filename": _PHOTO, "displayName": "Hero"})
    assert ensured.errors is None
    assert ensured.data["ensureMediaAsset"]["filename"] == _PHOTO
    assert ensured.data["ensureMediaAsset"]["displayName"] == "Hero"

    # Idempotent
    again = _execute(_ENSURE_ASSET, {"filename": _PHOTO})
    assert again.errors is None
    assert again.data["ensureMediaAsset"]["id"] == ensured.data["ensureMediaAsset"]["id"]

    created = _execute(_CREATE_COLLECTION, {"name": "Style references"})
    assert created.errors is None
    collection_id = created.data["createMediaCollection"]["id"]

    added = _execute(_ADD, {"collectionId": collection_id, "filename": _PHOTO})
    assert added.errors is None
    assert added.data["addMediaToCollection"]["memberCount"] == 1
    assert added.data["addMediaToCollection"]["members"][0]["filename"] == _PHOTO

    # Duplicate add is idempotent
    added2 = _execute(_ADD, {"collectionId": collection_id, "filename": _PHOTO})
    assert added2.errors is None
    assert added2.data["addMediaToCollection"]["memberCount"] == 1

    _execute(_ENSURE_ASSET, {"filename": _PHOTO_B})
    filtered = _execute(_LIST_ASSETS, {"collectionId": collection_id})
    assert filtered.errors is None
    assert len(filtered.data["mediaAssets"]) == 1
    assert filtered.data["mediaAssets"][0]["filename"] == _PHOTO

    all_assets = _execute(_LIST_ASSETS)
    assert all_assets.errors is None
    assert len(all_assets.data["mediaAssets"]) == 2

    removed = _execute(_REMOVE, {"collectionId": collection_id, "filename": _PHOTO})
    assert removed.errors is None
    assert removed.data["removeMediaFromCollection"]["memberCount"] == 0

    # Re-add then delete asset cascades membership
    _execute(_ADD, {"collectionId": collection_id, "filename": _PHOTO})
    deleted = _execute(_DELETE_ASSET, {"filename": _PHOTO})
    assert deleted.errors is None
    assert deleted.data["deleteMediaAsset"] is True
    colls = _execute(_LIST_COLLECTIONS)
    assert colls.data["mediaCollections"][0]["memberCount"] == 0

    gone = _execute(_DELETE_COLLECTION, {"id": collection_id})
    assert gone.errors is None
    assert gone.data["deleteMediaCollection"] is True


def test_invalid_filename_rejected(media_workspace_id: int):
    result = _execute(_ENSURE_ASSET, {"filename": "../secret.png"})
    assert result.errors is not None


def test_duplicate_collection_name(media_workspace_id: int):
    first = _execute(_CREATE_COLLECTION, {"name": "Menu"})
    assert first.errors is None
    second = _execute(_CREATE_COLLECTION, {"name": "Menu"})
    assert second.errors is not None
