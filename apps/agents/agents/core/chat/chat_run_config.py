"""Build RunnableConfig for chat threads (thread id, mode, tool context)."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.allowed_models import CHAT_GATEWAY_MODEL_ALLOWLIST
from agents_app.agents.core.chat.limits import CHAT_RECURSION_LIMIT
from fastapi import HTTPException
from langchain_core.runnables import RunnableConfig


def resolve_thread_id(user_id: str | None, agent_thread_id: str | None) -> str:
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")
    if agent_thread_id:
        return f"{user_id}:agent:{agent_thread_id}"
    raise HTTPException(
        status_code=400,
        detail="agent_thread_id is required",
    )


def resolved_chat_gateway_model(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    if s not in CHAT_GATEWAY_MODEL_ALLOWLIST:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported chat model: {s}. Use a gateway id from the app model list.",
        )
    return s


def runnable_config(
    *,
    thread_id: str,
    location_id: int | None,
    user_id: str | None,
    chat_gateway_model: str | None,
    analytics_run_id: int | None = None,
    post_id: str | None = None,
    page_id: str | None = None,
    generation_model: str | None = None,
    image_format: str | None = None,
    image_quality: str | None = None,
    style_id: int | None = None,
    generation_references: list[dict[str, Any]] | None = None,
    chat_mode: str | None = None,
    agent_thread_id: str | None = None,
) -> RunnableConfig:
    configurable: dict[str, Any] = {
        "thread_id": thread_id,
        "location_id": location_id,
        "user_id": user_id,
    }
    if agent_thread_id is not None:
        configurable["agent_thread_id"] = agent_thread_id
    if chat_gateway_model is not None:
        configurable["chat_gateway_model"] = chat_gateway_model
    if analytics_run_id is not None:
        configurable["analytics_run_id"] = analytics_run_id
    if post_id is not None:
        configurable["post_id"] = post_id
    if page_id is not None:
        configurable["page_id"] = page_id
    if generation_model is not None:
        configurable["generation_model"] = generation_model
    if image_format is not None:
        configurable["image_format"] = image_format
    if image_quality is not None:
        configurable["image_quality"] = image_quality
    if style_id is not None:
        configurable["style_id"] = style_id
    if generation_references is not None:
        configurable["generation_references"] = generation_references
    if chat_mode is not None:
        # Normalize legacy alias so downstream checks use a single ID.
        configurable["chat_mode"] = (
            "image_assistant" if chat_mode == "story_image_assistant" else chat_mode
        )
    return RunnableConfig(configurable=configurable, recursion_limit=CHAT_RECURSION_LIMIT)
