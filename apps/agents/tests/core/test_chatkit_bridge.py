"""Unit tests for ChatKit bridge helpers and widgets."""

from __future__ import annotations

import anyio
import pytest
from agents_app.agents.core.chatkit.bridge import (
    _cogs_edit_form_widget_from_tool_output,
    _cogs_list_widget_from_tool_output,
    _image_url_from_tool_output,
)
from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.agents.core.chatkit.memory_store import MemoryChatKitStore
from agents_app.agents.core.chatkit.widgets import (
    cogs_edit_form_widget,
    cogs_list_widget,
    story_confirm_widget,
)
from chatkit.store import NotFoundError


def test_image_url_from_json_tool_output() -> None:
    assert (
        _image_url_from_tool_output('{"url":"https://cdn.example/img.webp"}')
        == "https://cdn.example/img.webp"
    )


def test_image_url_from_plain_https() -> None:
    assert _image_url_from_tool_output("https://cdn.example/plain.webp") == (
        "https://cdn.example/plain.webp"
    )


def test_image_url_missing() -> None:
    assert _image_url_from_tool_output("Error: failed") is None
    assert _image_url_from_tool_output({"name": "x"}) is None


def test_story_confirm_widget_has_actions() -> None:
    card = story_confirm_widget(message="Ready?")
    dumped = card.model_dump(mode="json")
    assert dumped["type"] == "Card"
    text = str(dumped)
    assert "story.generate" in text
    assert "story.change" in text


def test_cogs_list_widget_card_from_bridge_helper() -> None:
    card = cogs_list_widget(
        [{"menu": "Pad Thai", "cogs": None, "status": "missing"}],
        missing_count=1,
        total_count=1,
    )
    assert card.model_dump(mode="json")["type"] == "Card"
    parsed = _cogs_list_widget_from_tool_output(
        '{"ok":true,"summary":{"total":1,"missing_count":1},'
        '"items":[{"menu":"Pad Thai","cogs":null,"status":"missing"}]}'
    )
    assert parsed is not None
    assert "Pad Thai" in str(parsed.model_dump(mode="json"))


def test_cogs_edit_form_widget_card_from_bridge_helper() -> None:
    card = cogs_edit_form_widget(
        [{"menu": "Pad Thai", "cogs": None, "status": "missing"}],
    )
    assert card.model_dump(mode="json")["type"] == "Card"
    parsed = _cogs_edit_form_widget_from_tool_output(
        '{"ok":true,"action":"request_cogs_edit",'
        '"items":[{"menu":"Pad Thai","cogs":null,"status":"missing"}]}'
    )
    assert parsed is not None
    dumped = str(parsed.model_dump(mode="json"))
    assert "Pad Thai" in dumped
    assert "cogs.edit_ack" in dumped


def test_memory_store_autocreates_agent_thread() -> None:
    store = MemoryChatKitStore()
    agent_tid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    ctx = ChatKitRequestContext(user_id="user-1", agent_thread_id=agent_tid)

    async def _run() -> None:
        thread = await store.load_thread(agent_tid, ctx)
        assert thread.id == agent_tid
        again = await store.load_thread(agent_tid, ctx)
        assert again.id == agent_tid

    anyio.run(_run)


def test_memory_store_rejects_unknown_thread() -> None:
    store = MemoryChatKitStore()
    ctx = ChatKitRequestContext(
        user_id="user-1",
        agent_thread_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    )

    async def _run() -> None:
        with pytest.raises(NotFoundError):
            await store.load_thread("bbbbbbbb-cccc-dddd-eeee-ffffffffffff", ctx)

    anyio.run(_run)
