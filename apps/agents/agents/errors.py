"""Structured error payloads for SSE and HTTP responses."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.graphql_base import GraphQLHttpError, classify_graphql_failure


def structured_error_payload(
    error: BaseException,
    *,
    default_code: str = "INTERNAL_SERVER_ERROR",
) -> dict[str, Any]:
    """Map exceptions to ``{error, code, message, retryable}`` for clients."""
    if isinstance(error, LLMInvokeError):
        return {
            "error": True,
            "code": error.code,
            "message": str(error),
            "retryable": error.retryable,
        }
    if isinstance(error, GraphQLHttpError):
        return {
            "error": True,
            "code": error.code,
            "message": str(error),
            "retryable": error.retryable,
        }
    failure = classify_graphql_failure(error)  # type: ignore[arg-type]
    if failure.code != "INTERNAL_SERVER_ERROR" or failure.retryable:
        return {
            "error": True,
            "code": failure.code,
            "message": failure.message,
            "retryable": failure.retryable,
        }
    return {
        "error": True,
        "code": default_code,
        "message": str(error),
        "retryable": False,
    }
