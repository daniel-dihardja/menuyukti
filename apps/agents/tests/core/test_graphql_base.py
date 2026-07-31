"""Tests for graphql_post retries and error classification."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from agents_app.agents.graphql_base import GraphQLHttpError, classify_graphql_failure, graphql_post


def test_classify_graphql_http_error() -> None:
    err = GraphQLHttpError("boom", code="FORBIDDEN", retryable=False)
    failure = classify_graphql_failure(err)
    assert failure.code == "FORBIDDEN"
    assert failure.retryable is False


def test_classify_timeout_retryable() -> None:
    failure = classify_graphql_failure(httpx.TimeoutException("slow"))
    assert failure.code == "UPSTREAM_TIMEOUT"
    assert failure.retryable is True


@pytest.mark.asyncio
async def test_graphql_post_retries_then_succeeds() -> None:
    client = MagicMock()
    ok = MagicMock()
    ok.raise_for_status = MagicMock()
    ok.json = MagicMock(return_value={"data": {"location": {"id": "1"}}})

    timeout = httpx.TimeoutException("slow")
    client.post = AsyncMock(side_effect=[timeout, ok])

    with (
        patch("agents_app.agents.graphql_base.graphql_endpoint", return_value="http://gql.test"),
        patch("agents_app.agents.graphql_base.graphql_headers", return_value={}),
        patch("agents_app.agents.graphql_base.asyncio.sleep", new_callable=AsyncMock) as sleep,
    ):
        data = await graphql_post(client, "query { location }", {}, "user-1", max_attempts=3)

    assert data == {"location": {"id": "1"}}
    assert client.post.await_count == 2
    sleep.assert_awaited()


@pytest.mark.asyncio
async def test_graphql_post_raises_non_retryable() -> None:
    client = MagicMock()
    bad = MagicMock()
    bad.raise_for_status = MagicMock()
    bad.json = MagicMock(
        return_value={
            "errors": [{"message": "nope", "extensions": {"code": "FORBIDDEN"}}],
        }
    )
    client.post = AsyncMock(return_value=bad)

    with (
        patch("agents_app.agents.graphql_base.graphql_endpoint", return_value="http://gql.test"),
        patch("agents_app.agents.graphql_base.graphql_headers", return_value={}),
        patch("agents_app.agents.graphql_base.asyncio.sleep", new_callable=AsyncMock) as sleep,
        pytest.raises(GraphQLHttpError) as exc_info,
    ):
        await graphql_post(client, "query { location }", {}, "user-1", max_attempts=3)

    assert exc_info.value.code == "FORBIDDEN"
    sleep.assert_not_awaited()
