"""Shared S3 media key validation for workspace-scoped posts media."""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from graphql.data_sources import Location, Workspace

_SAFE_POST_FILENAME = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$",
    re.IGNORECASE,
)


def validate_workspace_post_media_s3_key(
    key: str,
    *,
    workspace_id: int | None,
    owner_clerk_user_id: str,
    error_message: str = "Invalid media_s3_key",
) -> None:
    """Accept ``workspaces/{id}/posts/<uuid>.webp`` and/or legacy ``users/{owner}/posts/<uuid>.webp``."""
    allowed_prefixes: list[str] = [f"users/{owner_clerk_user_id}/posts/"]
    if workspace_id is not None:
        allowed_prefixes.insert(0, f"workspaces/{workspace_id}/posts/")

    filename: str | None = None
    for prefix in allowed_prefixes:
        if key.startswith(prefix) and key != prefix:
            filename = key[len(prefix) :]
            break

    if filename is None or "/" in filename or not _SAFE_POST_FILENAME.match(filename):
        raise ValueError(error_message)


def resolve_workspace_media_scope_for_location(
    session: Session,
    location_id: int,
) -> tuple[int | None, str]:
    """Return ``(workspace_id | None, owner_clerk_user_id)`` for a location."""
    loc = session.get(Location, location_id)
    if loc is None:
        raise ValueError("Location not found")
    if loc.workspace_id is not None:
        ws = session.get(Workspace, loc.workspace_id)
        if ws is None:
            raise ValueError("Workspace not found")
        return ws.id, ws.owner_clerk_user_id
    if loc.clerk_user_id:
        # Legacy locations without a workspace: only owner user-prefix keys are valid.
        return None, loc.clerk_user_id
    raise ValueError("Location has no workspace")


def resolve_workspace_media_scope_for_post(
    session: Session,
    workspace_id: int | None,
    created_by_clerk_user_id: str | None,
) -> tuple[int | None, str]:
    """Return ``(workspace_id | None, owner_clerk_user_id)`` for a post."""
    if workspace_id is not None:
        ws = session.get(Workspace, workspace_id)
        if ws is None:
            raise ValueError("Workspace not found")
        return ws.id, ws.owner_clerk_user_id
    if created_by_clerk_user_id:
        return None, created_by_clerk_user_id
    raise ValueError("Post has no workspace")
