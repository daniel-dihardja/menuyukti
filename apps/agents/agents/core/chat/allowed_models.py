"""Allowlisted gateway model ids for workflow/agent chat.

Keep in sync with apps/web/lib/chat/gateway-chat-models.ts (CHAT_GATEWAY_MODEL_IDS).
Verified against https://ai-gateway.vercel.sh/v1/models (May 2026).
"""

from __future__ import annotations

CHAT_GATEWAY_MODEL_ALLOWLIST: frozenset[str] = frozenset(
    {
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
        "openai/gpt-5.4",
        "openai/gpt-4.1-mini",
        "anthropic/claude-3.7-sonnet",
        "anthropic/claude-opus-4.6",
        "google/gemini-2.5-flash",
        "xai/grok-3",
        "mistral/mistral-large-3",
    }
)

# Vision subset for style draft-from-image. Keep in sync with
# apps/web/lib/chat/gateway-chat-models.ts (VISION_GATEWAY_MODEL_IDS).
VISION_GATEWAY_MODEL_ALLOWLIST: frozenset[str] = frozenset(
    {
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
        "openai/gpt-5.4",
        "openai/gpt-4.1-mini",
        "anthropic/claude-3.7-sonnet",
        "anthropic/claude-opus-4.6",
        "google/gemini-2.5-flash",
    }
)


def is_allowlisted_chat_gateway_model(model_id: str) -> bool:
    return model_id in CHAT_GATEWAY_MODEL_ALLOWLIST


def is_allowlisted_vision_gateway_model(model_id: str) -> bool:
    return model_id in VISION_GATEWAY_MODEL_ALLOWLIST
