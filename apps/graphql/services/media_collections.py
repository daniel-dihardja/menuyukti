"""Helpers for workspace media assets and collections."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from graphql.data_sources.models.media_asset import (
    MediaAsset,
    MediaCollection,
    MediaCollectionMember,
)

SAFE_PHOTO_FILENAME_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    r"\.(webp|jpg|jpeg|png|gif|avif|tif|tiff)$",
    re.IGNORECASE,
)

MAX_COLLECTION_NAME_LEN = 128
MAX_DISPLAY_NAME_LEN = 256


def is_safe_photo_filename(filename: str) -> bool:
    return bool(SAFE_PHOTO_FILENAME_RE.match(filename))


def validate_photo_filename(filename: str) -> str:
    cleaned = filename.strip() if isinstance(filename, str) else ""
    if not cleaned or not is_safe_photo_filename(cleaned):
        raise ValueError("Invalid photo filename")
    if "/" in cleaned or "\\" in cleaned:
        raise ValueError("Invalid photo filename")
    return cleaned


def validate_collection_name(name: str) -> str:
    cleaned = name.strip() if isinstance(name, str) else ""
    if not cleaned:
        raise ValueError("Collection name is required")
    if len(cleaned) > MAX_COLLECTION_NAME_LEN:
        raise ValueError(f"Collection name must be at most {MAX_COLLECTION_NAME_LEN} characters")
    return cleaned


def validate_display_name(display_name: str | None) -> str | None:
    if display_name is None:
        return None
    cleaned = display_name.strip()
    if not cleaned:
        return None
    if len(cleaned) > MAX_DISPLAY_NAME_LEN:
        raise ValueError(f"Display name must be at most {MAX_DISPLAY_NAME_LEN} characters")
    return cleaned


def ensure_media_asset(
    session: Session,
    *,
    workspace_id: int,
    user_id: str,
    filename: str,
    display_name: str | None = None,
) -> MediaAsset:
    """Idempotent catalog upsert by workspace + filename."""
    filename_clean = validate_photo_filename(filename)
    display_clean = validate_display_name(display_name)
    row = (
        session.query(MediaAsset)
        .filter(
            MediaAsset.workspace_id == workspace_id,
            MediaAsset.filename == filename_clean,
        )
        .first()
    )
    if row is not None:
        if display_clean is not None and row.display_name != display_clean:
            row.display_name = display_clean
        return row
    row = MediaAsset(
        workspace_id=workspace_id,
        filename=filename_clean,
        display_name=display_clean,
        created_by_clerk_user_id=user_id,
    )
    session.add(row)
    session.flush()
    return row


def delete_media_asset_by_filename(
    session: Session,
    *,
    workspace_id: int,
    filename: str,
) -> bool:
    """Delete catalog row (and memberships via cascade). Returns True if a row was removed."""
    filename_clean = validate_photo_filename(filename)
    row = (
        session.query(MediaAsset)
        .filter(
            MediaAsset.workspace_id == workspace_id,
            MediaAsset.filename == filename_clean,
        )
        .first()
    )
    if row is None:
        return False
    session.delete(row)
    return True


def get_collection_for_workspace(
    session: Session,
    *,
    collection_id: int,
    workspace_ids: list[int],
) -> MediaCollection | None:
    if not workspace_ids:
        return None
    return (
        session.query(MediaCollection)
        .filter(
            MediaCollection.id == collection_id,
            MediaCollection.workspace_id.in_(workspace_ids),
        )
        .first()
    )


def add_member(
    session: Session,
    *,
    collection: MediaCollection,
    asset: MediaAsset,
) -> MediaCollectionMember:
    if asset.workspace_id != collection.workspace_id:
        raise ValueError("Asset and collection must belong to the same workspace")
    existing = (
        session.query(MediaCollectionMember)
        .filter(
            MediaCollectionMember.collection_id == collection.id,
            MediaCollectionMember.asset_id == asset.id,
        )
        .first()
    )
    if existing is not None:
        return existing
    member = MediaCollectionMember(collection_id=collection.id, asset_id=asset.id)
    session.add(member)
    session.flush()
    return member


def remove_member(
    session: Session,
    *,
    collection: MediaCollection,
    asset: MediaAsset,
) -> bool:
    row = (
        session.query(MediaCollectionMember)
        .filter(
            MediaCollectionMember.collection_id == collection.id,
            MediaCollectionMember.asset_id == asset.id,
        )
        .first()
    )
    if row is None:
        return False
    session.delete(row)
    return True
