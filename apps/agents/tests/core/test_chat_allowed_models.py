"""Keep chat gateway allowlist well-formed."""

from agents_app.agents.core.chat.allowed_models import CHAT_GATEWAY_MODEL_ALLOWLIST


def test_chat_gateway_allowlist_nonempty_unique() -> None:
    assert len(CHAT_GATEWAY_MODEL_ALLOWLIST) >= 1
    assert len(CHAT_GATEWAY_MODEL_ALLOWLIST) == len(set(CHAT_GATEWAY_MODEL_ALLOWLIST))
