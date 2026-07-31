"""LangChain chat models via Vercel AI Gateway (OpenAI-compatible Chat Completions)."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Any

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

_AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1"
_DEFAULT_LOGICAL_MODEL = "gpt-4o-mini"


def _gateway_api_key() -> str:
    key = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("VERCEL_OIDC_TOKEN")
    if not key:
        msg = (
            "Missing AI Gateway credentials: set AI_GATEWAY_API_KEY "
            "(or VERCEL_OIDC_TOKEN on Vercel). See https://vercel.com/docs/ai-gateway"
        )
        raise RuntimeError(msg)
    return key


def _gateway_model_id() -> str:
    """Map OPENAI_MODEL to a gateway model id (provider/model)."""
    raw = os.environ.get("OPENAI_MODEL", _DEFAULT_LOGICAL_MODEL).strip()
    if "/" in raw:
        return raw
    return f"openai/{raw}"


def gateway_reporting_extra_body(
    *,
    user: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any] | None:
    """
    Build AI Gateway Custom Reporting ``providerOptions.gateway`` payload.

    See https://vercel.com/docs/ai-gateway/observability-and-spend/custom-reporting
    Limits: user ≤256 chars; ≤10 tags, each 1–64 chars.
    """
    gateway: dict[str, Any] = {}
    uid = user.strip() if isinstance(user, str) else ""
    if uid:
        gateway["user"] = uid[:256]
    cleaned_tags: list[str] = []
    if tags:
        for raw in tags:
            if not isinstance(raw, str):
                continue
            t = raw.strip()[:64]
            if t and t not in cleaned_tags:
                cleaned_tags.append(t)
            if len(cleaned_tags) >= 10:
                break
    if cleaned_tags:
        gateway["tags"] = cleaned_tags
    if not gateway:
        return None
    return {"providerOptions": {"gateway": gateway}}


def _chat_openai(
    *,
    streaming: bool,
    reporting_user: str | None = None,
    reporting_tags: list[str] | None = None,
) -> ChatOpenAI:
    kwargs: dict[str, Any] = {
        "model": _gateway_model_id(),
        "api_key": SecretStr(_gateway_api_key()),
        "base_url": _AI_GATEWAY_BASE_URL,
        "temperature": 0,
        "streaming": streaming,
    }
    extra = gateway_reporting_extra_body(user=reporting_user, tags=reporting_tags)
    if extra is not None:
        kwargs["extra_body"] = extra
    return ChatOpenAI(**kwargs)


@lru_cache(maxsize=32)
def _cached_chat_openai_for_gateway(*, gateway_model_id: str, streaming: bool) -> ChatOpenAI:
    """Shared client without per-user reporting (placeholders / unattributed calls)."""
    return ChatOpenAI(
        model=gateway_model_id,
        api_key=SecretStr(_gateway_api_key()),
        base_url=_AI_GATEWAY_BASE_URL,
        temperature=0,
        streaming=streaming,
    )


def chat_llm_for_gateway_model(
    gateway_model_id: str | None,
    *,
    streaming: bool = True,
    reporting_user: str | None = None,
    reporting_tags: list[str] | None = None,
) -> ChatOpenAI:
    """Chat LLM for an explicit gateway id, or env default when ``gateway_model_id`` is empty.

    When ``reporting_user`` / ``reporting_tags`` are set, returns a non-cached client so
    attribution is not shared across users via ``_cached_chat_openai_for_gateway``.
    """
    resolved = (
        gateway_model_id.strip()
        if isinstance(gateway_model_id, str) and gateway_model_id.strip()
        else _gateway_model_id()
    )
    extra = gateway_reporting_extra_body(user=reporting_user, tags=reporting_tags)
    if extra is None:
        return _cached_chat_openai_for_gateway(gateway_model_id=resolved, streaming=streaming)
    return ChatOpenAI(
        model=resolved,
        api_key=SecretStr(_gateway_api_key()),
        base_url=_AI_GATEWAY_BASE_URL,
        temperature=0,
        streaming=streaming,
        extra_body=extra,
    )


def get_llm(
    *,
    reporting_user: str | None = None,
    reporting_tags: list[str] | None = None,
) -> ChatOpenAI:
    """Return a streaming ChatOpenAI client targeting the Vercel AI Gateway."""
    return _chat_openai(
        streaming=True,
        reporting_user=reporting_user,
        reporting_tags=reporting_tags,
    )


def get_llm_structured(
    *,
    reporting_user: str | None = None,
    reporting_tags: list[str] | None = None,
) -> ChatOpenAI:
    """Non-streaming model for structured output / deterministic evaluation."""
    return _chat_openai(
        streaming=False,
        reporting_user=reporting_user,
        reporting_tags=reporting_tags,
    )
