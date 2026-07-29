"""Shared helpers for Instagram item GraphQL operations."""

from __future__ import annotations

import re
from typing import Any

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from graphql.data_sources import InstagramItem, InstagramItemPage, Node
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.schema.auth import is_location_owner, is_workspace_member
from graphql.schema.types.instagram_item import (
    InstagramItemPageMediaVersionType,
    InstagramItemPageType,
    InstagramItemReferenceImageInput,
    InstagramItemReferenceImageType,
    InstagramItemType,
)

VALID_KINDS = frozenset({"story", "post", "reel"})
VALID_STATUSES = frozenset({"draft", "ready"})
MAX_REFERENCE_IMAGES = 5
MAX_INSTAGRAM_ITEM_PAGES = 10

_SAFE_PHOTO_FILENAME = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    r"\.(webp|jpg|jpeg|png|gif|avif|tif|tiff)$",
    re.IGNORECASE,
)

ITEM_PAGES_LOAD = joinedload(InstagramItem.pages).joinedload(InstagramItemPage.media_versions)


def _reference_images_to_gql(
    raw: list[dict[str, Any]] | None,
) -> list[InstagramItemReferenceImageType]:
    if not isinstance(raw, list):
        return []
    out: list[InstagramItemReferenceImageType] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        enabled = item.get("enabled", True)
        out.append(
            InstagramItemReferenceImageType(
                name=name.strip(),
                enabled=bool(enabled),
            )
        )
    return out


def _media_version_to_gql(row) -> InstagramItemPageMediaVersionType:
    return InstagramItemPageMediaVersionType(
        id=strawberry.ID(str(row.id)),
        media_s3_key=row.media_s3_key,
        prompt=row.prompt,
        created_at=row.created_at,
    )


def page_to_gql(row: InstagramItemPage) -> InstagramItemPageType:
    versions = list(row.media_versions) if row.media_versions is not None else []
    versions.sort(key=lambda version: (version.created_at, version.id), reverse=True)
    return InstagramItemPageType(
        id=strawberry.ID(str(row.id)),
        sort_order=row.sort_order,
        media_s3_key=row.media_s3_key,
        prompt=row.prompt,
        media_versions=[_media_version_to_gql(version) for version in versions],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def item_to_gql(row: InstagramItem) -> InstagramItemType:
    pages = list(row.pages) if row.pages is not None else []
    pages.sort(key=lambda page: (page.sort_order, page.id))
    return InstagramItemType(
        id=strawberry.ID(str(row.id)),
        workflow_id=strawberry.ID(str(row.workflow_id)),
        location_id=row.location_id,
        kind=row.kind,
        title=row.title,
        caption=row.caption,
        hook=row.hook,
        visual_brief=row.visual_brief,
        generation_prompt=row.generation_prompt,
        reference_images=_reference_images_to_gql(row.reference_images),
        pages=[page_to_gql(page) for page in pages],
        style_id=row.style_id,
        status=row.status,
        schedule=row.schedule,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def resolve_style_id_for_user(session, style_id: int, user_id: str) -> int:
    """Validate style exists and the user is a member of its workspace."""
    row = session.get(VisualStyle, style_id)
    if row is None:
        raise ValueError("Style pack not found")
    if not is_workspace_member(session, row.workspace_id, user_id):
        raise PermissionError("Not allowed to use this style pack")
    return row.id


def validate_item_media_s3_key(
    key: str,
    *,
    workspace_id: int | None,
    owner_clerk_user_id: str,
) -> None:
    """Require workspace or legacy owner posts keys for Instagram item pages."""
    from graphql.schema.media_s3_keys import validate_workspace_post_media_s3_key

    validate_workspace_post_media_s3_key(
        key,
        workspace_id=workspace_id,
        owner_clerk_user_id=owner_clerk_user_id,
        error_message="Invalid media_s3_key for Instagram item page",
    )


def item_workspace_media_scope(session, item_row: InstagramItem) -> tuple[int | None, str]:
    """Resolve workspace id + owner for an Instagram item's location."""
    from graphql.schema.media_s3_keys import resolve_workspace_media_scope_for_location

    return resolve_workspace_media_scope_for_location(session, item_row.location_id)


def normalize_reference_images(
    raw: list[InstagramItemReferenceImageInput] | list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    """Validate and normalize media-library reference attachments."""
    if raw is None:
        return []
    if len(raw) > MAX_REFERENCE_IMAGES:
        raise ValueError(f"At most {MAX_REFERENCE_IMAGES} reference images are allowed")

    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in raw:
        if isinstance(item, InstagramItemReferenceImageInput):
            name = item.name.strip()
            enabled = bool(item.enabled)
        elif isinstance(item, dict):
            name_raw = item.get("name")
            if not isinstance(name_raw, str):
                raise ValueError("referenceImages.name is required")
            name = name_raw.strip()
            enabled = bool(item.get("enabled", True))
        else:
            raise ValueError("Invalid referenceImages entry")

        if not name:
            raise ValueError("referenceImages.name cannot be empty")
        if not _SAFE_PHOTO_FILENAME.match(name):
            raise ValueError(f"Invalid reference image name: {name!r}")
        if name in seen:
            continue
        seen.add(name)
        out.append({"name": name, "enabled": enabled})
    return out


def parse_positive_id(raw: object, *, label: str) -> int:
    try:
        pk = int(str(raw))
    except (TypeError, ValueError) as e:
        raise ValueError(f"Invalid {label}") from e
    if pk < 1:
        raise ValueError(f"Invalid {label}")
    return pk


def normalize_kind(kind: str) -> str:
    cleaned = kind.strip().lower()
    if cleaned not in VALID_KINDS:
        raise ValueError(f"kind must be one of: {', '.join(sorted(VALID_KINDS))}")
    return cleaned


def normalize_status(status: str) -> str:
    cleaned = status.strip().lower()
    if cleaned not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
    return cleaned


def normalize_optional_text(value: str | None, *, max_len: int | None = None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if cleaned == "":
        return None
    if max_len is not None and len(cleaned) > max_len:
        raise ValueError(f"Text exceeds maximum length of {max_len}")
    return cleaned


def load_workflow_for_owner(session, workflow_pk: int, user_id: str) -> Node:
    workflow = session.get(Node, workflow_pk)
    if workflow is None or workflow.node_type != "workflow":
        raise ValueError("Workflow not found")
    if workflow.location_id is None:
        raise ValueError("Workflow has no location")
    if not is_location_owner(session, workflow.location_id, user_id):
        raise PermissionError("Not allowed to access this workflow")
    return workflow


def load_item_for_owner(session, item_pk: int, user_id: str) -> InstagramItem:
    row = session.get(
        InstagramItem,
        item_pk,
        options=[ITEM_PAGES_LOAD],
    )
    if row is None:
        raise ValueError("Instagram item not found")
    if not is_location_owner(session, row.location_id, user_id):
        raise PermissionError("Not allowed to access this Instagram item")
    return row


def reload_item_with_pages(session, item_pk: int) -> InstagramItem:
    """Re-load item + pages + versions, refreshing identity-map state after commit."""
    stmt = (
        select(InstagramItem)
        .where(InstagramItem.id == item_pk)
        .options(ITEM_PAGES_LOAD)
        .execution_options(populate_existing=True)
    )
    row = session.scalars(stmt).unique().one_or_none()
    if row is None:
        raise ValueError("Instagram item not found")
    return row


def load_page_for_owner(session, page_pk: int, user_id: str) -> InstagramItemPage:
    page_row = session.get(
        InstagramItemPage,
        page_pk,
        options=[joinedload(InstagramItemPage.media_versions)],
    )
    if page_row is None:
        raise ValueError("Instagram item page not found")
    item_row = load_item_for_owner(session, page_row.instagram_item_id, user_id)
    # Ensure page belongs to the authorized item (load_item_for_owner already checks ownership).
    _ = item_row
    return page_row


def reload_page_with_versions(session, page_pk: int) -> InstagramItemPage:
    stmt = (
        select(InstagramItemPage)
        .where(InstagramItemPage.id == page_pk)
        .options(joinedload(InstagramItemPage.media_versions))
        .execution_options(populate_existing=True)
    )
    page_row = session.scalars(stmt).unique().one_or_none()
    if page_row is None:
        raise ValueError("Instagram item page not found")
    return page_row
