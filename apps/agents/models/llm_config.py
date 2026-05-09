"""LangChain chat models via Vercel AI Gateway (OpenAI-compatible Chat Completions)."""

import os
from functools import lru_cache

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


def _chat_openai(*, streaming: bool) -> ChatOpenAI:
    return ChatOpenAI(
        model=_gateway_model_id(),
        api_key=SecretStr(_gateway_api_key()),
        base_url=_AI_GATEWAY_BASE_URL,
        temperature=0,
        streaming=streaming,
    )


@lru_cache(maxsize=32)
def _cached_chat_openai_for_gateway(*, gateway_model_id: str, streaming: bool) -> ChatOpenAI:
    return ChatOpenAI(
        model=gateway_model_id,
        api_key=SecretStr(_gateway_api_key()),
        base_url=_AI_GATEWAY_BASE_URL,
        temperature=0,
        streaming=streaming,
    )


def chat_llm_for_gateway_model(
    gateway_model_id: str | None, *, streaming: bool = True
) -> ChatOpenAI:
    """Chat LLM for an explicit gateway id, or env default when ``gateway_model_id`` is empty."""
    resolved = (
        gateway_model_id.strip()
        if isinstance(gateway_model_id, str) and gateway_model_id.strip()
        else _gateway_model_id()
    )
    return _cached_chat_openai_for_gateway(gateway_model_id=resolved, streaming=streaming)


def get_llm() -> ChatOpenAI:
    """Return a streaming ChatOpenAI client targeting the Vercel AI Gateway."""
    return _chat_openai(streaming=True)


def get_llm_structured() -> ChatOpenAI:
    """Non-streaming model for structured output / deterministic evaluation."""
    return _chat_openai(streaming=False)
