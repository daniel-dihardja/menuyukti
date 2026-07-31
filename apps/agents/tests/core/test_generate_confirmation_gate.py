"""Tests for Image Assistant generate confirmation gate."""

from agents_app.agents.core.chat.generate_confirmation_gate import (
    STORY_GENERATE_CONFIRM_REPLY,
    image_assistant_generate_block_reason,
)
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage


def test_blocks_without_confirmation() -> None:
    reason = image_assistant_generate_block_reason(
        [HumanMessage(content="Make a story about pasta")]
    )
    assert reason is not None
    assert "request_story_generate_confirmation" in reason


def test_blocks_confirmation_without_user_yes() -> None:
    reason = image_assistant_generate_block_reason(
        [
            HumanMessage(content="Make a story"),
            AIMessage(content="", tool_calls=[{"name": "request_story_generate_confirmation", "args": {}, "id": "c1"}]),
            ToolMessage(
                content='{"ok": true, "action": "request_confirmation"}',
                tool_call_id="c1",
                name="request_story_generate_confirmation",
            ),
            AIMessage(content="Click Generate when ready."),
        ]
    )
    assert reason is not None
    assert STORY_GENERATE_CONFIRM_REPLY in reason


def test_allows_after_confirm_reply() -> None:
    reason = image_assistant_generate_block_reason(
        [
            HumanMessage(content="Make a story"),
            ToolMessage(
                content='{"ok": true, "action": "request_confirmation"}',
                tool_call_id="c1",
                name="request_story_generate_confirmation",
            ),
            AIMessage(content="Ready?"),
            HumanMessage(content=STORY_GENERATE_CONFIRM_REPLY),
        ]
    )
    assert reason is None


def test_allows_refine_when_scratchpad_has_result() -> None:
    reason = image_assistant_generate_block_reason(
        [HumanMessage(content="Make it darker")],
        story_assets=[
            {
                "role": "result",
                "name": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
                "note": "",
            }
        ],
    )
    assert reason is None


def test_allows_refine_after_successful_generate() -> None:
    reason = image_assistant_generate_block_reason(
        [
            HumanMessage(content="Make a story"),
            ToolMessage(
                content='{"url": "https://cdn.example/x.webp", "name": "x.webp", "prompt": "pasta"}',
                tool_call_id="g1",
                name="generate_instagram_post_image",
            ),
            HumanMessage(content="Make it darker"),
        ]
    )
    assert reason is None
