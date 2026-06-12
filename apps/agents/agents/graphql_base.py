"""Shared GraphQL HTTP helpers for agents (httpx + auth headers)."""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Any, cast

import httpx


@dataclass(frozen=True)
class GraphQLFailure:
    code: str
    message: str
    retryable: bool


class GraphQLHttpError(RuntimeError):
    """GraphQL response contained errors or no data."""

    def __init__(
        self,
        message: str,
        *,
        errors: list[dict[str, Any]] | None = None,
        code: str = "INTERNAL_SERVER_ERROR",
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.errors = errors
        self.code = code
        self.retryable = retryable


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


def _error_code(err: dict[str, Any]) -> str:
    ext = err.get("extensions")
    if isinstance(ext, dict):
        code = ext.get("code")
        if isinstance(code, str) and code.strip():
            return code
    return "INTERNAL_SERVER_ERROR"


def classify_graphql_failure(error: Exception) -> GraphQLFailure:
    if isinstance(error, GraphQLHttpError):
        return GraphQLFailure(
            code=error.code,
            message=str(error),
            retryable=error.retryable,
        )
    if isinstance(error, httpx.TimeoutException):
        return GraphQLFailure(code="UPSTREAM_TIMEOUT", message=str(error), retryable=True)
    if isinstance(error, httpx.HTTPStatusError):
        status = error.response.status_code
        retryable = status >= 500
        return GraphQLFailure(
            code=f"UPSTREAM_HTTP_{status}",
            message=str(error),
            retryable=retryable,
        )
    if isinstance(error, httpx.RequestError):
        return GraphQLFailure(code="UPSTREAM_NETWORK", message=str(error), retryable=True)
    return GraphQLFailure(code="INTERNAL_SERVER_ERROR", message=str(error), retryable=False)


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
    *,
    max_attempts: int = 3,
) -> dict[str, Any]:
    last: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
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
                first = errors[0]
                detail = _first_error_detail(first)
                code = _error_code(first)
                raise GraphQLHttpError(
                    detail,
                    errors=errors,
                    code=code,
                    retryable=code == "INTERNAL_SERVER_ERROR",
                )
            data = body.get("data")
            if not isinstance(data, dict):
                raise GraphQLHttpError("GraphQL returned no data", errors=None)
            return data
        except Exception as exc:
            last = exc
            failure = classify_graphql_failure(exc)
            if attempt >= max_attempts or not failure.retryable:
                raise
            await asyncio.sleep(0.5 * (2 ** (attempt - 1)))
    assert last is not None
    raise last
