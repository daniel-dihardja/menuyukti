"""Tests for AI Gateway Custom Reporting attribution helpers."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from agents_app.models.llm_config import (
    chat_llm_for_gateway_model,
    gateway_reporting_extra_body,
)


def test_gateway_reporting_extra_body_empty() -> None:
    assert gateway_reporting_extra_body() is None
    assert gateway_reporting_extra_body(user="  ") is None
    assert gateway_reporting_extra_body(tags=[]) is None


def test_gateway_reporting_extra_body_user_and_tags() -> None:
    body = gateway_reporting_extra_body(
        user="user_abc",
        tags=["feature:chat", "mode:general", "feature:chat", "  "],
    )
    assert body == {
        "providerOptions": {
            "gateway": {
                "user": "user_abc",
                "tags": ["feature:chat", "mode:general"],
            }
        }
    }


def test_gateway_reporting_extra_body_limits() -> None:
    long_user = "u" * 300
    tags = [f"tag:{i}" for i in range(15)]
    body = gateway_reporting_extra_body(user=long_user, tags=tags)
    assert body is not None
    gateway = body["providerOptions"]["gateway"]
    assert len(gateway["user"]) == 256
    assert len(gateway["tags"]) == 10


@patch("agents_app.models.llm_config._gateway_api_key", return_value="test-key")
@patch("agents_app.models.llm_config.ChatOpenAI")
def test_chat_llm_for_gateway_model_attaches_reporting(
    mock_chat: MagicMock,
    _mock_key: MagicMock,
) -> None:
    mock_chat.return_value = MagicMock(name="llm")
    chat_llm_for_gateway_model(
        "openai/gpt-4o-mini",
        streaming=True,
        reporting_user="user_1",
        reporting_tags=["feature:chat", "mode:general"],
    )
    kwargs = mock_chat.call_args.kwargs
    assert kwargs["extra_body"] == {
        "providerOptions": {
            "gateway": {
                "user": "user_1",
                "tags": ["feature:chat", "mode:general"],
            }
        }
    }


@patch("agents_app.models.llm_config._gateway_api_key", return_value="test-key")
@patch("agents_app.models.llm_config._cached_chat_openai_for_gateway")
def test_chat_llm_without_reporting_uses_cache(
    mock_cached: MagicMock,
    _mock_key: MagicMock,
) -> None:
    mock_cached.return_value = MagicMock(name="cached")
    out = chat_llm_for_gateway_model("openai/gpt-4o-mini", streaming=True)
    mock_cached.assert_called_once_with(
        gateway_model_id="openai/gpt-4o-mini",
        streaming=True,
    )
    assert out is mock_cached.return_value
