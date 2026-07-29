"""GraphQL helpers for workspace media collections (chat tools)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import MEDIA_ASSETS_QUERY, MEDIA_COLLECTIONS_QUERY


async def list_media_collections(
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    data = await graphql_post(client, MEDIA_COLLECTIONS_QUERY, {}, user_id)
    raw = data.get("mediaCollections")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


async def list_media_assets(
    user_id: str,
    *,
    collection_id: int | None = None,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    variables: dict[str, Any] = {"collectionId": collection_id}
    data = await graphql_post(client, MEDIA_ASSETS_QUERY, variables, user_id)
    raw = data.get("mediaAssets")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]
