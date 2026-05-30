"""Bounded retries and structured errors for LangChain LLM calls."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Sequence
from typing import Any, TypeVar

import httpx
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.runnables import Runnable
from openai import APIConnectionError, APIStatusError, APITimeoutError, RateLimitError
from pydantic import BaseModel, ValidationError

_logger = logging.getLogger(__name__)

DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_BASE_DELAY_S = 0.5

STRUCTURED_OUTPUT_FAILED = "STRUCTURED_OUTPUT_FAILED"
LLM_UPSTREAM = "LLM_UPSTREAM"

T = TypeVar("T", bound=BaseModel)


class LLMInvokeError(RuntimeError):
    """Raised when LLM calls fail after retries or structured parsing fails."""

    def __init__(
        self,
        message: str,
        *,
        code: str = LLM_UPSTREAM,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


def is_retryable_llm_error(error: BaseException) -> bool:
    """True for transient gateway / network failures worth retrying."""
    if isinstance(error, (asyncio.TimeoutError, TimeoutError)):
        return True
    if isinstance(error, httpx.TimeoutException):
        return True
    if isinstance(error, RateLimitError):
        return True
    if isinstance(error, (APIConnectionError, APITimeoutError)):
        return True
    if isinstance(error, APIStatusError):
        return int(getattr(error, "status_code", 0) or 0) >= 500
    if isinstance(error, httpx.HTTPStatusError):
        return error.response.status_code >= 500
    if isinstance(error, httpx.RequestError):
        return True
    msg = str(error).lower()
    return "timeout" in msg or "rate limit" in msg or "503" in msg or "502" in msg


async def ainvoke_with_retry(
    runnable: Runnable[Any, Any],
    input: Sequence[BaseMessage] | dict[str, Any],
    *,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    base_delay_s: float = DEFAULT_BASE_DELAY_S,
) -> Any:
    """Invoke a LangChain runnable with exponential backoff on transient errors."""
    last: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            return await runnable.ainvoke(input)
        except ValidationError:
            raise
        except Exception as exc:
            last = exc
            if attempt >= max_attempts or not is_retryable_llm_error(exc):
                break
            delay = base_delay_s * (2 ** (attempt - 1))
            _logger.warning(
                "llm_invoke: retry attempt=%s/%s delay=%.1fs error=%s",
                attempt,
                max_attempts,
                delay,
                exc,
            )
            await asyncio.sleep(delay)
    assert last is not None
    raise LLMInvokeError(
        f"{LLM_UPSTREAM}: {last}",
        code=LLM_UPSTREAM,
        retryable=is_retryable_llm_error(last),
    ) from last


async def astream_collect_with_retry(
    llm: BaseChatModel,
    messages: Sequence[BaseMessage],
    *,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    base_delay_s: float = DEFAULT_BASE_DELAY_S,
) -> str:
    """Stream chat tokens into a single string with retries on stream start failures."""
    last: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            full = ""
            async for chunk in llm.astream(messages):
                c = chunk.content
                if isinstance(c, str):
                    full += c
                elif isinstance(c, list):
                    full += "".join(str(x) for x in c)
            return full
        except Exception as exc:
            last = exc
            if attempt >= max_attempts or not is_retryable_llm_error(exc):
                break
            delay = base_delay_s * (2 ** (attempt - 1))
            _logger.warning(
                "llm_invoke.astream: retry attempt=%s/%s delay=%.1fs error=%s",
                attempt,
                max_attempts,
                delay,
                exc,
            )
            await asyncio.sleep(delay)
    assert last is not None
    raise LLMInvokeError(
        f"{LLM_UPSTREAM}: {last}",
        code=LLM_UPSTREAM,
        retryable=is_retryable_llm_error(last),
    ) from last


async def structured_ainvoke_with_retry[T: BaseModel](
    llm: BaseChatModel,
    output_model: type[T],
    messages: Sequence[BaseMessage],
    *,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
) -> T:
    """Structured output invoke with retries; maps parse failures to STRUCTURED_OUTPUT_FAILED."""
    structured = llm.with_structured_output(output_model)
    try:
        result = await ainvoke_with_retry(structured, list(messages), max_attempts=max_attempts)
    except ValidationError as exc:
        raise LLMInvokeError(
            f"{STRUCTURED_OUTPUT_FAILED}: {exc}",
            code=STRUCTURED_OUTPUT_FAILED,
            retryable=False,
        ) from exc
    if isinstance(result, output_model):
        return result
    if isinstance(result, BaseModel):
        return output_model.model_validate(result.model_dump())
    if isinstance(result, dict):
        return output_model.model_validate(result)
    raise LLMInvokeError(
        f"{STRUCTURED_OUTPUT_FAILED}: unexpected result type {type(result)!r}",
        code=STRUCTURED_OUTPUT_FAILED,
        retryable=False,
    )


def emit_llm_error_step(code: str, message: str) -> None:
    """Emit a compact custom stream step when LangGraph stream writer is available."""
    try:
        from langgraph.config import get_stream_writer

        writer = get_stream_writer()
        writer({"step": "error", "error_code": code, "error_message": message[:500]})
    except Exception:  # pragma: no cover - outside graph context
        pass
