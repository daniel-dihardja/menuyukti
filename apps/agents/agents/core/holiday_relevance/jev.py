"""Jev evaluation via Vercel AI Gateway (TypeSafe-compatible systemone API)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.models.llm_config import gateway_api_key

_logger = logging.getLogger(__name__)

JEV_MODEL_ID = "typesafe-ai/jev"
_SYSTEMONE_URL = "https://ai-gateway.vercel.sh/typesafe/v1/systemone"
RELEVANCE_NOUL_THRESHOLD = 0.5


async def systemone_evaluate(
    client: httpx.AsyncClient,
    *,
    state: str,
    questions: dict[str, dict[str, Any]],
    model: str = JEV_MODEL_ID,
) -> dict[str, float]:
    """
    Call Jev through AI Gateway; return map of question key → noul probability.

    Raises ``LLMInvokeError`` on HTTP / payload failures (router maps to 502).
    """
    if not questions:
        return {}

    try:
        api_key = gateway_api_key()
    except RuntimeError as exc:
        raise LLMInvokeError(str(exc), code="LLM_UPSTREAM", retryable=False) from exc

    try:
        response = await client.post(
            _SYSTEMONE_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "state": state,
                "questions": questions,
            },
            timeout=60.0,
        )
    except httpx.TimeoutException as exc:
        raise LLMInvokeError(
            f"LLM_UPSTREAM: Jev request timed out: {exc}",
            code="LLM_UPSTREAM",
            retryable=True,
        ) from exc
    except httpx.HTTPError as exc:
        raise LLMInvokeError(
            f"LLM_UPSTREAM: Jev request failed: {exc}",
            code="LLM_UPSTREAM",
            retryable=True,
        ) from exc

    if response.status_code >= 400:
        detail = response.text[:500]
        try:
            payload = response.json()
            if isinstance(payload, dict):
                msg = payload.get("message") or payload.get("detail") or detail
                detail = str(msg)[:500]
        except Exception:  # noqa: BLE001
            pass
        raise LLMInvokeError(
            f"LLM_UPSTREAM: Jev HTTP {response.status_code}: {detail}",
            code="LLM_UPSTREAM",
            retryable=response.status_code >= 500,
        )

    try:
        body = response.json()
    except Exception as exc:
        raise LLMInvokeError(
            f"LLM_UPSTREAM: invalid Jev JSON response: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    answers = body.get("answers") if isinstance(body, dict) else None
    if not isinstance(answers, dict):
        raise LLMInvokeError(
            "LLM_UPSTREAM: Jev response missing answers",
            code="LLM_UPSTREAM",
            retryable=False,
        )

    nouls: dict[str, float] = {}
    for key, answer in answers.items():
        if not isinstance(answer, dict):
            continue
        raw = answer.get("noul")
        if isinstance(raw, bool):
            nouls[str(key)] = 1.0 if raw else 0.0
        elif isinstance(raw, (int, float)):
            nouls[str(key)] = float(raw)
        else:
            _logger.warning("jev answer missing noul for key=%s answer=%r", key, answer)
    return nouls


def nouls_to_relevant(
    nouls: dict[str, float],
    *,
    threshold: float = RELEVANCE_NOUL_THRESHOLD,
) -> dict[str, bool]:
    """Map noul probabilities to relevant booleans."""
    return {key: value >= threshold for key, value in nouls.items()}
