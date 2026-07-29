"""Tests for media collections GraphQL client helpers used by chat tools."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest
from agents_app.agents.core.chat.media_collections_client import (
    list_media_assets,
    list_media_collections,
)


@pytest.mark.asyncio
async def test_list_media_collections_filters_non_dicts(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_post(
        client: httpx.AsyncClient,
        query: str,
        variables: dict[str, Any],
        user_id: str,
    ) -> dict[str, Any]:
        assert "mediaCollections" in query
        return {
            "mediaCollections": [
                {"id": 1, "name": "Style references", "memberCount": 2},
                "bad",
            ]
        }

    monkeypatch.setattr(
        "agents_app.agents.core.chat.media_collections_client.graphql_post",
        fake_post,
    )
    client = AsyncMock(spec=httpx.AsyncClient)
    rows = await list_media_collections("user_1", client=client)
    assert rows == [{"id": 1, "name": "Style references", "memberCount": 2}]


@pytest.mark.asyncio
async def test_list_media_assets_passes_collection_id(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    async def fake_post(
        client: httpx.AsyncClient,
        query: str,
        variables: dict[str, Any],
        user_id: str,
    ) -> dict[str, Any]:
        seen["variables"] = variables
        return {
            "mediaAssets": [
                {"filename": "11111111-1111-1111-1111-111111111111.webp", "displayName": None}
            ]
        }

    monkeypatch.setattr(
        "agents_app.agents.core.chat.media_collections_client.graphql_post",
        fake_post,
    )
    client = AsyncMock(spec=httpx.AsyncClient)
    rows = await list_media_assets("user_1", collection_id=9, client=client)
    assert seen["variables"] == {"collectionId": 9}
    assert len(rows) == 1
