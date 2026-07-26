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
