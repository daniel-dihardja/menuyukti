"""OpenAI ChatKit server integration for LangGraph chat (advisor UI)."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents_app.agents.core.chatkit.server import MenuyuktiChatKitServer

__all__ = ["MenuyuktiChatKitServer", "build_chatkit_server"]


def build_chatkit_server(*args, **kwargs):  # noqa: ANN002, ANN003
    from agents_app.agents.core.chatkit.server import build_chatkit_server as _build

    return _build(*args, **kwargs)
