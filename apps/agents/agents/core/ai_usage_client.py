"""Record AI usage events via GraphQL (LLM / Leonardo ledger)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post

_logger = logging.getLogger(__name__)

_RECORD_MUTATION = """
mutation RecordAiUsageEvent(
  $provider: String!
  $feature: String!
  $status: String!
  $model: String
  $externalId: String
  $units: Int
  $metadata: JSON
) {
  recordAiUsageEvent(
    provider: $provider
    feature: $feature
    status: $status
    model: $model
    externalId: $externalId
    units: $units
    metadata: $metadata
  ) {
    id
  }
}
"""


def usage_from_model_result(result: Any) -> dict[str, int]:
    """Extract token counts from a LangChain model response / AIMessage."""
    candidates: list[Any] = [result]
    if hasattr(result, "result"):
        inner = getattr(result, "result", None)
        if isinstance(inner, list):
            candidates.extend(inner)
        elif inner is not None:
            candidates.append(inner)
    if hasattr(result, "messages"):
        msgs = getattr(result, "messages", None)
        if isinstance(msgs, list):
            candidates.extend(msgs)

    for obj in candidates:
        usage = getattr(obj, "usage_metadata", None)
        if isinstance(usage, dict):
            inp = usage.get("input_tokens") or usage.get("input_token") or 0
            out = usage.get("output_tokens") or usage.get("output_token") or 0
            total = usage.get("total_tokens") or (int(inp or 0) + int(out or 0))
            return {
                "input_tokens": int(inp or 0),
                "output_tokens": int(out or 0),
                "total_tokens": int(total or 0),
            }
        meta = getattr(obj, "response_metadata", None)
        if isinstance(meta, dict):
            token_usage = meta.get("token_usage") or meta.get("usage") or {}
            if isinstance(token_usage, dict):
                inp = token_usage.get("prompt_tokens") or token_usage.get("input_tokens") or 0
                out = (
                    token_usage.get("completion_tokens") or token_usage.get("output_tokens") or 0
                )
                total = token_usage.get("total_tokens") or (int(inp or 0) + int(out or 0))
                return {
                    "input_tokens": int(inp or 0),
                    "output_tokens": int(out or 0),
                    "total_tokens": int(total or 0),
                }
    return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}


async def record_ai_usage_event(
    client: httpx.AsyncClient,
    *,
    user_id: str,
    provider: str,
    feature: str,
    status: str = "succeeded",
    model: str | None = None,
    units: int = 1,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Best-effort append to the GraphQL usage ledger (never raises to callers)."""
    uid = user_id.strip() if isinstance(user_id, str) else ""
    if not uid:
        return
    try:
        await graphql_post(
            client,
            _RECORD_MUTATION,
            {
                "provider": provider,
                "feature": feature,
                "status": status,
                "model": model,
                "externalId": None,
                "units": units,
                "metadata": metadata,
            },
            uid,
            max_attempts=2,
        )
    except Exception:  # noqa: BLE001 — metering must not break product paths
        _logger.warning(
            "record_ai_usage_event failed provider=%s feature=%s user=%s",
            provider,
            feature,
            uid[:8],
            exc_info=True,
        )
