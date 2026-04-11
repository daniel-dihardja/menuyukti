"""Shared GraphQL HTTP helpers for agents (httpx + auth headers)."""

from __future__ import annotations

import os
from typing import Any, cast

import httpx


class GraphQLHttpError(RuntimeError):
    """GraphQL response contained errors or no data."""

    def __init__(
        self,
        message: str,
        *,
        errors: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.errors = errors


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


def _first_error_detail(err: dict[str, Any]) -> str:
    parts: list[str] = []
    msg = err.get("message")
    if isinstance(msg, str) and msg:
        parts.append(msg)
    path = err.get("path")
    if isinstance(path, list) and path:
        parts.append(f"path={path}")
    ext = err.get("extensions")
    if isinstance(ext, dict):
        code = ext.get("code")
        if code is not None:
            parts.append(f"code={code}")
    return "; ".join(parts) if parts else "GraphQL error"


def _errors_list(raw: object) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if isinstance(item, dict):
            out.append(item)
    return out


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
    errors = _errors_list(body.get("errors"))
    if errors:
        detail = _first_error_detail(errors[0])
        raise GraphQLHttpError(detail, errors=errors)
    data = body.get("data")
    if not isinstance(data, dict):
        raise GraphQLHttpError("GraphQL returned no data", errors=None)
    return data
