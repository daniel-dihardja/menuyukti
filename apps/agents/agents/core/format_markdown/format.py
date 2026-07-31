"""LLM-backed Markdown formatting (core platform helper)."""

from __future__ import annotations

import httpx
from agents_app.agents.core.ai_usage_client import record_ai_usage_event, usage_from_model_result
from agents_app.agents.core.format_markdown.presets import get_preset_system_prompt
from agents_app.agents.core.llm_invoke import ainvoke_with_retry
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class UnknownPresetError(ValueError):
    """Raised when ``preset`` is not registered in ``presets.PRESETS``."""


async def format_markdown(
    *,
    content: str,
    preset: str,
    reporting_user: str | None = None,
) -> str:
    """
    Rewrite ``content`` as Markdown using the system rules for ``preset``.

    This is a single-shot call (no LangGraph). Used by the HTTP ``/format-markdown`` endpoint.
    """
    system = get_preset_system_prompt(preset)
    if system is None:
        raise UnknownPresetError(f"Unknown preset: {preset}")

    llm = get_llm_structured(
        reporting_user=reporting_user,
        reporting_tags=["feature:format-markdown"],
    )
    msg = await ainvoke_with_retry(
        llm,
        [
            SystemMessage(content=system),
            HumanMessage(content=content),
        ],
    )
    if reporting_user:
        tokens = usage_from_model_result(msg)
        async with httpx.AsyncClient() as client:
            await record_ai_usage_event(
                client,
                user_id=reporting_user,
                provider="ai_gateway",
                feature="format_markdown",
                status="succeeded",
                units=1,
                metadata={
                    "input_tokens": tokens["input_tokens"],
                    "output_tokens": tokens["output_tokens"],
                    "total_tokens": tokens["total_tokens"],
                },
            )
    raw = msg.content if isinstance(msg, AIMessage) else getattr(msg, "content", "")
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, list):
        parts: list[str] = []
        for block in raw:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
            elif hasattr(block, "text"):
                parts.append(str(getattr(block, "text", "")))
        return "".join(parts).strip()
    return str(raw).strip()
