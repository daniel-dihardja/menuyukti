"""Tests for chat wrap_tool_call error middleware."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest
from agents_app.agents.core.chat.graph import _handle_tool_errors
from langchain.agents.middleware import ToolCallRequest
from langchain_core.messages import ToolMessage


@pytest.mark.asyncio
async def test_handle_tool_errors_returns_tool_message() -> None:
    request = ToolCallRequest(
        tool_call={"name": "get_location_data", "args": {}, "id": "call-1"},
        tool=None,
        state={},
        runtime=None,  # type: ignore[arg-type]
    )

    async def boom(_req: Any) -> Any:
        raise RuntimeError("graphql down")

    result = await _handle_tool_errors.awrap_tool_call(request, boom)
    assert isinstance(result, ToolMessage)
    assert result.tool_call_id == "call-1"
    assert "graphql down" in str(result.content)


@pytest.mark.asyncio
async def test_handle_tool_errors_passes_through_success() -> None:
    request = ToolCallRequest(
        tool_call={"name": "list_media", "args": {}, "id": "call-2"},
        tool=None,
        state={},
        runtime=None,  # type: ignore[arg-type]
    )
    ok = ToolMessage(content="ok", tool_call_id="call-2")
    handler = AsyncMock(return_value=ok)
    result = await _handle_tool_errors.awrap_tool_call(request, handler)
    assert result is ok
