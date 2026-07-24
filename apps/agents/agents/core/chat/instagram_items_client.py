"""GraphQL helpers for workflow-scoped Instagram items (chat tools)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    CREATE_INSTAGRAM_ITEM_MUTATION,
    DELETE_INSTAGRAM_ITEM_MUTATION,
    INSTAGRAM_ITEM_QUERY,
    INSTAGRAM_ITEMS_QUERY,
    UPDATE_INSTAGRAM_ITEM_MUTATION,
)


async def list_instagram_items(
    workflow_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Return Instagram items for a workflow (earliest schedule first)."""
    data = await graphql_post(
        client,
        INSTAGRAM_ITEMS_QUERY,
        {"workflowId": workflow_id},
        user_id,
    )
    raw = data.get("instagramItems")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


async def fetch_instagram_item(
    item_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return one Instagram item by id, or None if missing / inaccessible."""
    data = await graphql_post(
        client,
        INSTAGRAM_ITEM_QUERY,
        {"id": item_id},
        user_id,
    )
    raw = data.get("instagramItem")
    if not isinstance(raw, dict):
        return None
    return raw


async def create_instagram_item(
    workflow_id: str,
    user_id: str,
    *,
    kind: str,
    title: str | None = None,
    caption: str | None = None,
    hook: str | None = None,
    visual_brief: str | None = None,
    status: str | None = None,
    schedule: str | None = None,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Create one Instagram item; returns the created item dict."""
    variables: dict[str, Any] = {
        "workflowId": workflow_id,
        "kind": kind,
    }
    if title is not None:
        variables["title"] = title
    if caption is not None:
        variables["caption"] = caption
    if hook is not None:
        variables["hook"] = hook
    if visual_brief is not None:
        variables["visualBrief"] = visual_brief
    if status is not None:
        variables["status"] = status
    if schedule is not None:
        variables["schedule"] = schedule

    data = await graphql_post(
        client,
        CREATE_INSTAGRAM_ITEM_MUTATION,
        variables,
        user_id,
    )
    item = data.get("createInstagramItem")
    if not isinstance(item, dict):
        msg = "createInstagramItem returned invalid payload"
        raise RuntimeError(msg)
    return item


async def update_instagram_item(
    item_id: str,
    user_id: str,
    *,
    kind: str | None = None,
    title: str | None = None,
    caption: str | None = None,
    hook: str | None = None,
    visual_brief: str | None = None,
    status: str | None = None,
    schedule: Any = ...,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Patch one Instagram item. Pass ``schedule=None`` to clear; omit with ``...``."""
    variables: dict[str, Any] = {"id": item_id}
    if kind is not None:
        variables["kind"] = kind
    if title is not None:
        variables["title"] = title
    if caption is not None:
        variables["caption"] = caption
    if hook is not None:
        variables["hook"] = hook
    if visual_brief is not None:
        variables["visualBrief"] = visual_brief
    if status is not None:
        variables["status"] = status
    if schedule is not ...:
        variables["schedule"] = schedule

    data = await graphql_post(
        client,
        UPDATE_INSTAGRAM_ITEM_MUTATION,
        variables,
        user_id,
    )
    item = data.get("updateInstagramItem")
    if not isinstance(item, dict):
        msg = "updateInstagramItem returned invalid payload"
        raise RuntimeError(msg)
    return item


async def delete_instagram_item(
    item_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> bool:
    """Delete one Instagram item; returns True on success."""
    data = await graphql_post(
        client,
        DELETE_INSTAGRAM_ITEM_MUTATION,
        {"id": item_id},
        user_id,
    )
    return bool(data.get("deleteInstagramItem"))
