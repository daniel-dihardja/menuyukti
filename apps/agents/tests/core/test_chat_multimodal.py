"""Unit tests for multimodal chat user messages."""

import pytest
from agents_app.agents.core.chat.graph import incremental_user_message
from langchain_core.messages import HumanMessage


def test_incremental_user_message_plain_text() -> None:
    msg = incremental_user_message([{"role": "user", "content": "Hello"}])
    assert isinstance(msg, HumanMessage)
    assert msg.content == "Hello"


def test_incremental_user_message_rejects_empty_text() -> None:
    with pytest.raises(ValueError, match="non-empty"):
        incremental_user_message([{"role": "user", "content": "   "}])


def test_incremental_user_message_multimodal_blocks() -> None:
    data_url = "data:image/png;base64,abc"
    msg = incremental_user_message(
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What is this?"},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ]
    )
    assert isinstance(msg.content, list)
    assert msg.content[0] == {"type": "text", "text": "What is this?"}
    assert msg.content[1] == {"type": "image_url", "image_url": {"url": data_url}}


def test_incremental_user_message_image_only_adds_cue() -> None:
    data_url = "data:image/jpeg;base64,xyz"
    msg = incremental_user_message(
        [
            {
                "role": "user",
                "content": [{"type": "image_url", "image_url": data_url}],
            }
        ]
    )
    assert isinstance(msg.content, list)
    assert msg.content[0]["type"] == "text"
    assert "analyze" in msg.content[0]["text"].lower()
    assert msg.content[1]["type"] == "image_url"


def test_incremental_user_message_rejects_bad_image_url() -> None:
    with pytest.raises(ValueError, match="data:image"):
        incremental_user_message(
            [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "hi"},
                        {"type": "image_url", "image_url": {"url": "ftp://x"}},
                    ],
                }
            ]
        )
