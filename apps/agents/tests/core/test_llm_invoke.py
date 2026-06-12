"""Tests for LLM retry helpers."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from agents_app.agents.core.llm_invoke import (
    LLMInvokeError,
    ainvoke_with_retry,
    is_retryable_llm_error,
)
from openai import APIStatusError


def test_is_retryable_timeout() -> None:
    assert is_retryable_llm_error(httpx.TimeoutException("timeout"))


def test_is_retryable_5xx() -> None:
    err = APIStatusError("server", response=MagicMock(status_code=503), body=None)
    assert is_retryable_llm_error(err)


@pytest.mark.asyncio
async def test_ainvoke_with_retry_succeeds_on_second_attempt() -> None:
    runnable = MagicMock()
    runnable.ainvoke = AsyncMock(
        side_effect=[httpx.TimeoutException("t"), {"ok": True}],
    )
    out = await ainvoke_with_retry(runnable, [])
    assert out == {"ok": True}
    assert runnable.ainvoke.await_count == 2


@pytest.mark.asyncio
async def test_ainvoke_with_retry_raises_llm_invoke_error() -> None:
    runnable = MagicMock()
    runnable.ainvoke = AsyncMock(side_effect=ValueError("bad input"))
    with pytest.raises(LLMInvokeError) as exc_info:
        await ainvoke_with_retry(runnable, [], max_attempts=2)
    assert exc_info.value.code == "LLM_UPSTREAM"
