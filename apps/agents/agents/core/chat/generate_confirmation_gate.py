"""Helpers: UI-signaling confirmation gate for Image Assistant generate."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

# Keep in sync with apps/web/lib/chat/story-generate-confirmation.ts
STORY_GENERATE_CONFIRM_REPLY = "Yes, generate"
REQUEST_STORY_GENERATE_CONFIRMATION = "request_story_generate_confirmation"
GENERATE_INSTAGRAM_POST_IMAGE = "generate_instagram_post_image"

_CONFIRM_PHRASES = frozenset(
    {
        STORY_GENERATE_CONFIRM_REPLY.lower(),
        "yes generate",
        "generate",
        "yes, please generate",
    }
)


def _message_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)
    return str(content) if content is not None else ""


def _tool_name(message: ToolMessage) -> str:
    name = getattr(message, "name", None)
    if isinstance(name, str) and name.strip():
        return name.strip()
    return ""


def _is_confirmation_tool_message(message: ToolMessage) -> bool:
    if _tool_name(message) == REQUEST_STORY_GENERATE_CONFIRMATION:
        return True
    text = _message_text(message.content)
    if "request_confirmation" not in text:
        return False
    try:
        payload = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return '"action": "request_confirmation"' in text or '"action":"request_confirmation"' in text
    return isinstance(payload, dict) and payload.get("action") == "request_confirmation"


def _is_successful_generate_tool_message(message: ToolMessage) -> bool:
    text = _message_text(message.content).strip()
    if not text or text.lower().startswith("error"):
        return False
    if _tool_name(message) == GENERATE_INSTAGRAM_POST_IMAGE:
        try:
            payload = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return "url" in text
        return isinstance(payload, dict) and isinstance(payload.get("url"), str) and bool(payload["url"])
    try:
        payload = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return False
    return (
        isinstance(payload, dict)
        and isinstance(payload.get("url"), str)
        and bool(payload["url"])
        and (payload.get("action") == "save_result" or "prompt" in payload)
    )


def _is_confirm_human_message(message: HumanMessage) -> bool:
    text = _message_text(message.content).strip().lower()
    if not text:
        return False
    if text in _CONFIRM_PHRASES:
        return True
    # Allow slight punctuation/whitespace variants of the canned UI reply.
    normalized = " ".join(text.replace(",", " ").split())
    return normalized in _CONFIRM_PHRASES or normalized.startswith("yes generate")


def image_assistant_generate_block_reason(
    messages: list[Any] | None,
    *,
    story_assets: list[Any] | None = None,
) -> str | None:
    """Return an error string if Image Assistant generate must be refused, else None.

    This is a code-level gate for the UI-signaling confirmation tool (not LangGraph
    ``interrupt()`` HITL). Refine turns after a successful generate (message history
    or scratchpad ``result`` asset) are allowed.
    """
    if isinstance(story_assets, list):
        for asset in story_assets:
            if isinstance(asset, dict) and asset.get("role") == "result":
                name = asset.get("name")
                if isinstance(name, str) and name.strip():
                    return None

    msgs: list[BaseMessage] = [m for m in (messages or []) if isinstance(m, BaseMessage)]

    for message in msgs:
        if isinstance(message, ToolMessage) and _is_successful_generate_tool_message(message):
            return None

    last_confirm_idx = -1
    for idx, message in enumerate(msgs):
        if isinstance(message, ToolMessage) and _is_confirmation_tool_message(message):
            last_confirm_idx = idx
        if isinstance(message, AIMessage):
            for call in message.tool_calls or []:
                if (
                    isinstance(call, dict)
                    and call.get("name") == REQUEST_STORY_GENERATE_CONFIRMATION
                    and last_confirm_idx < 0
                ):
                    last_confirm_idx = idx

    if last_confirm_idx < 0:
        return (
            "Error: call request_story_generate_confirmation and wait for the user to "
            f"confirm (e.g. {STORY_GENERATE_CONFIRM_REPLY!r}) before generating."
        )

    for message in msgs[last_confirm_idx + 1 :]:
        if isinstance(message, HumanMessage) and _is_confirm_human_message(message):
            return None

    return (
        "Error: wait for the user to confirm generation "
        f"(e.g. {STORY_GENERATE_CONFIRM_REPLY!r}) after request_story_generate_confirmation."
    )
