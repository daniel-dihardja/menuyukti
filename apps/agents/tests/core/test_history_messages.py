"""Tests for LangChain checkpoint → UIMessage DTO conversion."""

from __future__ import annotations

import json

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from agents_app.agents.core.chat.history_messages import (
    HISTORY_MESSAGE_CAP,
    langchain_messages_to_ui_messages,
    normalize_story_assets,
)


def test_empty_messages() -> None:
    assert langchain_messages_to_ui_messages(None) == []
    assert langchain_messages_to_ui_messages([]) == []


def test_human_and_assistant_text() -> None:
    msgs = [
        HumanMessage(content="Hello", id="u1"),
        AIMessage(content="Hi there", id="a1"),
    ]
    out = langchain_messages_to_ui_messages(msgs)
    assert len(out) == 2
    assert out[0] == {
        "id": "u1",
        "role": "user",
        "parts": [{"type": "text", "text": "Hello"}],
    }
    assert out[1]["role"] == "assistant"
    assert out[1]["parts"] == [{"type": "text", "text": "Hi there"}]


def test_human_skips_image_only_content() -> None:
    msgs = [
        HumanMessage(
            content=[
                {"type": "image_url", "image_url": {"url": "data:image/png;base64,xx"}},
            ],
            id="u1",
        )
    ]
    assert langchain_messages_to_ui_messages(msgs) == []


def test_assistant_with_tool_output_preserves_media_s3_key() -> None:
    payload = {
        "url": "https://cdn.example.com/a.webp",
        "name": "a.webp",
        "mediaS3Key": "workspaces/ws/posts/a.webp",
    }
    msgs = [
        HumanMessage(content="make image", id="u1"),
        AIMessage(
            content="",
            id="a1",
            tool_calls=[
                {
                    "name": "generate_instagram_post_image",
                    "id": "call-1",
                    "args": {"prompt": "neon bowl"},
                }
            ],
        ),
        ToolMessage(
            content=json.dumps(payload),
            tool_call_id="call-1",
            name="generate_instagram_post_image",
        ),
    ]
    out = langchain_messages_to_ui_messages(msgs)
    assert len(out) == 2
    tool_part = out[1]["parts"][0]
    assert tool_part["type"] == "tool-generate_instagram_post_image"
    assert tool_part["toolCallId"] == "call-1"
    assert tool_part["state"] == "output-available"
    assert tool_part["input"] == {"prompt": "neon bowl"}
    assert json.loads(tool_part["output"]) == payload


def test_skips_system_and_orphan_tools() -> None:
    msgs = [
        SystemMessage(content="sys"),
        ToolMessage(content="orphan", tool_call_id="x", name="t"),
        HumanMessage(content="ok", id="u1"),
    ]
    out = langchain_messages_to_ui_messages(msgs)
    assert len(out) == 1
    assert out[0]["role"] == "user"


def test_human_strips_llm_only_attached_media_section() -> None:
    name = "f72bd586-2e75-4017-8e23-0db2bb1c3781.png"
    content = (
        "## Attached media library photos\n"
        "These images are also attached as vision inputs. Call `save_story_asset` "
        "only with these exact filenames when labeling style/content; do not invent, "
        "guess, or truncate names. If this section is absent, do not call "
        "`save_story_asset`.\n"
        f"1. {name}\n\n"
        "Please label style"
    )
    out = langchain_messages_to_ui_messages([HumanMessage(content=content, id="u1")])
    assert len(out) == 1
    text = out[0]["parts"][0]["text"]
    assert "save_story_asset" not in text
    assert "## Attached media library photos" not in text
    assert f"Attached: {name}" in text
    assert "Please label style" in text


def test_message_cap_keeps_tail() -> None:
    msgs = [HumanMessage(content=f"m{i}", id=f"u{i}") for i in range(HISTORY_MESSAGE_CAP + 5)]
    out = langchain_messages_to_ui_messages(msgs)
    assert len(out) == HISTORY_MESSAGE_CAP
    assert out[0]["parts"][0]["text"] == "m5"
    assert out[-1]["parts"][0]["text"] == f"m{HISTORY_MESSAGE_CAP + 4}"


def test_normalize_story_assets() -> None:
    assert normalize_story_assets(None) == []
    assert normalize_story_assets(
        [
            {"role": "style", "name": "a.webp", "note": "x"},
            {"role": "bad", "name": "b.webp"},
            {"role": "result", "name": "  c.webp  "},
        ]
    ) == [
        {"role": "style", "name": "a.webp", "note": "x"},
        {"role": "result", "name": "c.webp", "note": ""},
    ]
