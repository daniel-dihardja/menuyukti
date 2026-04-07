"""Shared GraphQL HTTP helpers for agents (httpx + auth headers)."""

from __future__ import annotations

import os
from typing import Any, cast

import httpx


def graphql_endpoint() -> str:
    url = os.environ.get("GRAPHQL_ENDPOINT", "").strip()
    if not url:
        msg = "GRAPHQL_ENDPOINT is not set"
        raise RuntimeError(msg)
    return url


def graphql_headers(user_id: str) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    key = os.environ.get("GRAPHQL_INTERNAL_API_KEY", "").strip()
    if key:
        headers["X-Internal-Api-Key"] = key
    headers["X-User-Id"] = user_id
    return headers


async def graphql_post(
    client: httpx.AsyncClient,
    query: str,
    variables: dict[str, Any],
    user_id: str,
) -> dict[str, Any]:
    res = await client.post(
        graphql_endpoint(),
        json={"query": query, "variables": variables},
        headers=graphql_headers(user_id),
        timeout=60.0,
    )
    res.raise_for_status()
    body = cast(dict[str, Any], res.json())
    errors = body.get("errors")
    if errors:
        first = errors[0] if isinstance(errors, list) and errors else {}
        msg = (
            str(first.get("message", "GraphQL error"))
            if isinstance(first, dict)
            else "GraphQL error"
        )
        raise RuntimeError(msg)
    data = body.get("data")
    if not isinstance(data, dict):
        msg = "GraphQL returned no data"
        raise RuntimeError(msg)
    return data
