"""Unit tests for generate_instagram_post_image chat tool."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.fixture
def tool_under_test():
    from agents_app.agents.core.chat.generate_instagram_post_image import (
        generate_instagram_post_image,
    )

    return generate_instagram_post_image


def _config(**kwargs: Any) -> dict[str, Any]:
    return {"configurable": kwargs}


def _confirmed_image_assistant_runtime(**state_extra: Any) -> Any:
    """Runtime whose message history satisfies the confirm-before-generate gate."""
    from agents_app.agents.core.chat.generate_confirmation_gate import (
        STORY_GENERATE_CONFIRM_REPLY,
    )
    from langchain.tools import ToolRuntime
    from langchain_core.messages import HumanMessage, ToolMessage

    state: dict[str, Any] = {
        "messages": [
            HumanMessage(content="Make a story"),
            ToolMessage(
                content='{"ok": true, "action": "request_confirmation"}',
                tool_call_id="c1",
                name="request_story_generate_confirmation",
            ),
            HumanMessage(content=STORY_GENERATE_CONFIRM_REPLY),
        ],
        "story_assets": [],
    }
    state.update(state_extra)
    return ToolRuntime(
        state=state,
        context=None,
        config={},
        stream_writer=lambda *_a: None,
        tool_call_id="tc-gen",
        store=None,
    )


@pytest.mark.asyncio
async def test_missing_user_id(tool_under_test: Any) -> None:
    out = await tool_under_test.ainvoke(
        {"prompt": "A sunny brunch plate"},
        config=_config(),
    )
    assert "user context is missing" in out


@pytest.mark.asyncio
async def test_empty_prompt(tool_under_test: Any) -> None:
    out = await tool_under_test.ainvoke(
        {"prompt": "   "},
        config=_config(user_id="user-1", post_id="1", page_id="2"),
    )
    assert "non-empty" in out


@pytest.mark.asyncio
async def test_accepts_internal_api_key_alone(tool_under_test: Any, monkeypatch: Any) -> None:
    """Outbound generate should honor INTERNAL_API_KEY like inbound middleware."""
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.delenv("GRAPHQL_INTERNAL_API_KEY", raising=False)
    monkeypatch.setenv("INTERNAL_API_KEY", "from-internal")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = "{}"
    mock_response.json.return_value = {
        "url": "https://example.com/img.webp",
        "name": "abc.webp",
        "mediaS3Key": "users/u/posts/abc.webp",
        "createdAt": "2026-01-01T00:00:00.000Z",
    }
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        out = await tool_under_test.ainvoke(
            {"prompt": "A sunny brunch plate"},
            config=_config(user_id="user-1", agent_thread_id="t1"),
        )

    payload = json.loads(out)
    assert payload["url"] == "https://example.com/img.webp"
    headers = mock_client.post.await_args.kwargs["headers"]
    assert headers["X-Internal-Api-Key"] == "from-internal"


@pytest.mark.asyncio
async def test_success_without_post_page(tool_under_test: Any, monkeypatch: Any) -> None:
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps(
        {
            "url": "https://example.com/img.webp",
            "name": "abc.webp",
            "mediaS3Key": "users/u/posts/abc.webp",
            "createdAt": "2026-01-01T00:00:00.000Z",
        }
    )
    mock_response.json.return_value = {
        "url": "https://example.com/img.webp",
        "name": "abc.webp",
        "mediaS3Key": "users/u/posts/abc.webp",
        "createdAt": "2026-01-01T00:00:00.000Z",
    }
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        out = await tool_under_test.ainvoke(
            {"prompt": "Bright sun in a clear sky", "format": "story"},
            config=_config(user_id="user-1"),
        )

    payload = json.loads(out)
    assert payload["url"] == "https://example.com/img.webp"
    assert payload["prompt"] == "Bright sun in a clear sky"

    body = mock_client.post.await_args.kwargs["json"]
    assert "postId" not in body
    assert "pageId" not in body
    assert body["format"] == "story"
    assert body["prompt"] == "Bright sun in a clear sky"


@pytest.mark.asyncio
async def test_success_calls_web_generate(tool_under_test: Any, monkeypatch: Any) -> None:
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps(
        {
            "url": "https://example.com/img.webp",
            "name": "abc.webp",
            "mediaS3Key": "users/u/posts/abc.webp",
            "createdAt": "2026-01-01T00:00:00.000Z",
        }
    )
    mock_response.json.return_value = {
        "url": "https://example.com/img.webp",
        "name": "abc.webp",
        "mediaS3Key": "users/u/posts/abc.webp",
        "createdAt": "2026-01-01T00:00:00.000Z",
    }
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        out = await tool_under_test.ainvoke(
            {"prompt": "Warm lighting on pasta"},
            config=_config(
                user_id="user-1",
                post_id="10",
                page_id="20",
                generation_model="gemini-2.5-flash-image",
                image_format="feed",
                image_quality="high",
                style_id=3,
                generation_references=[{"type": "photo", "name": "a.webp"}],
            ),
        )

    payload = json.loads(out)
    assert payload["url"] == "https://example.com/img.webp"
    assert payload["prompt"] == "Warm lighting on pasta"

    mock_client.post.assert_awaited_once()
    call_kwargs = mock_client.post.await_args
    assert call_kwargs.args[0] == "http://127.0.0.1:3000/api/posts/generate"
    assert call_kwargs.kwargs["headers"]["X-Internal-Api-Key"] == "secret"
    assert call_kwargs.kwargs["headers"]["X-User-Id"] == "user-1"
    body = call_kwargs.kwargs["json"]
    assert body["postId"] == "10"
    assert body["pageId"] == "20"
    assert body["model"] == "gemini-2.5-flash-image"
    assert body["styleId"] == 3
    assert body["references"] == [{"type": "photo", "name": "a.webp"}]


@pytest.mark.asyncio
async def test_tool_args_override_configurable(tool_under_test: Any, monkeypatch: Any) -> None:
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"url": "https://example.com/img.webp"})
    mock_response.json.return_value = {"url": "https://example.com/img.webp"}
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        await tool_under_test.ainvoke(
            {
                "prompt": "A plate",
                "format": "square",
                "model": "nano-banana-2",
                "quality": "ultra",
            },
            config=_config(
                user_id="user-1",
                image_format="feed",
                generation_model="gemini-2.5-flash-image",
                image_quality="standard",
            ),
        )

    body = mock_client.post.await_args.kwargs["json"]
    assert body["format"] == "square"
    assert body["model"] == "nano-banana-2"
    assert body["quality"] == "ultra"


@pytest.mark.asyncio
async def test_image_assistant_uses_configurable_format(
    tool_under_test: Any, monkeypatch: Any
) -> None:
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"url": "https://example.com/img.webp"})
    mock_response.json.return_value = {"url": "https://example.com/img.webp"}
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        await tool_under_test.ainvoke(
            {
                "prompt": "Ice matcha feed",
                "format": "story",
                "runtime": _confirmed_image_assistant_runtime(),
            },
            config=_config(
                user_id="user-1",
                chat_mode="image_assistant",
                image_format="feed",
            ),
        )

    body = mock_client.post.await_args.kwargs["json"]
    assert body["format"] == "feed"


@pytest.mark.asyncio
async def test_image_assistant_defaults_format_story_when_unset(
    tool_under_test: Any, monkeypatch: Any
) -> None:
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"url": "https://example.com/img.webp"})
    mock_response.json.return_value = {"url": "https://example.com/img.webp"}
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        await tool_under_test.ainvoke(
            {
                "prompt": "Ice matcha story",
                "runtime": _confirmed_image_assistant_runtime(),
            },
            config=_config(
                user_id="user-1",
                chat_mode="image_assistant",
            ),
        )

    body = mock_client.post.await_args.kwargs["json"]
    assert body["format"] == "story"


@pytest.mark.asyncio
async def test_story_mode_uses_story_assets_as_references(
    tool_under_test: Any, monkeypatch: Any
) -> None:
    from langchain.tools import ToolRuntime

    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    style_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
    content_name = "11111111-2222-3333-4444-555555555555.jpg"
    result_name = "cccccccc-dddd-eeee-ffff-000000000000.webp"
    runtime = ToolRuntime(
        state={
            "story_assets": [
                {"role": "style", "name": style_name, "note": "neon"},
                {"role": "content", "name": content_name, "note": "bowl"},
                {"role": "result", "name": result_name, "note": ""},
            ]
        },
        context=None,
        config={},
        stream_writer=lambda *_a: None,
        tool_call_id="tc-gen",
        store=None,
    )

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps({"url": "https://example.com/img.webp"})
    mock_response.json.return_value = {"url": "https://example.com/img.webp"}
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        await tool_under_test.ainvoke(
            {"prompt": "Story with style and content", "runtime": runtime},
            config=_config(
                user_id="user-1",
                chat_mode="image_assistant",
                # empty request-scoped refs — scratchpad alone should populate
            ),
        )

    body = mock_client.post.await_args.kwargs["json"]
    assert body["format"] == "story"
    assert body["references"] == [
        {"type": "photo", "name": style_name},
        {"type": "photo", "name": content_name},
        {"type": "previous-result", "filename": result_name},
    ]


@pytest.mark.asyncio
async def test_story_mode_generate_upserts_result_command(
    tool_under_test: Any, monkeypatch: Any
) -> None:
    from langchain.tools import ToolRuntime
    from langgraph.types import Command

    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    style_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
    out_name = "dddddddd-eeee-ffff-aaaa-111111111111.webp"
    runtime = ToolRuntime(
        state={
            "story_assets": [
                {"role": "style", "name": style_name, "note": ""},
                {
                    "role": "result",
                    "name": "cccccccc-dddd-eeee-ffff-000000000000.webp",
                    "note": "",
                },
            ]
        },
        context=None,
        config={},
        stream_writer=lambda *_a: None,
        tool_call_id="tc-gen-2",
        store=None,
    )

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps(
        {
            "url": "https://example.com/new.webp",
            "name": out_name,
            "mediaS3Key": f"users/u/posts/{out_name}",
            "createdAt": "2026-01-01T00:00:00.000Z",
        }
    )
    mock_response.json.return_value = {
        "url": "https://example.com/new.webp",
        "name": out_name,
        "mediaS3Key": f"users/u/posts/{out_name}",
        "createdAt": "2026-01-01T00:00:00.000Z",
    }
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        out = await tool_under_test.ainvoke(
            {"prompt": "Make the sky blue", "runtime": runtime},
            config=_config(user_id="user-1", chat_mode="image_assistant"),
        )

    assert isinstance(out, Command)
    assert out.update is not None
    results = [a for a in out.update["story_assets"] if a["role"] == "result"]
    assert results == [{"role": "result", "name": out_name, "note": ""}]
    payload = json.loads(out.update["messages"][0].content)
    assert payload["action"] == "save_result"
    assert payload["url"] == "https://example.com/new.webp"
    assert payload["story_assets"] == out.update["story_assets"]


@pytest.mark.asyncio
async def test_http_error(tool_under_test: Any, monkeypatch: Any) -> None:
    monkeypatch.setenv("WEB_APP_URL", "http://127.0.0.1:3000")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")

    mock_response = MagicMock()
    mock_response.status_code = 502
    mock_response.reason_phrase = "Bad Gateway"
    mock_response.text = '{"message":"Leonardo failed","code":"leonardo"}'
    mock_response.json.return_value = {"message": "Leonardo failed", "code": "leonardo"}
    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch(
        "agents_app.agents.core.chat.generate_instagram_post_image.get_chat_http_client",
        return_value=mock_client,
    ):
        out = await tool_under_test.ainvoke(
            {"prompt": "A plate"},
            config=_config(user_id="user-1", post_id="1", page_id="2"),
        )

    assert out.startswith("Error: generate failed (502)")
    assert "leonardo" in out
