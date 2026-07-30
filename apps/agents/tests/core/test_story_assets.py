"""Unit tests for Story asset scratchpad helpers and tools."""

from __future__ import annotations

import json

from langchain.messages import HumanMessage
from langchain.tools import ToolRuntime
from langgraph.types import Command

VALID_STYLE = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
VALID_CONTENT = "11111111-2222-3333-4444-555555555555.jpg"


def _attached_user_message(*names: str) -> HumanMessage:
    lines = [
        "## Attached media library photos",
        "These images are also attached as vision inputs.",
        *[f"{i}. {name}" for i, name in enumerate(names, start=1)],
    ]
    return HumanMessage(content="\n".join(lines))


def _runtime(
    *,
    assets: list | None = None,
    tool_call_id: str = "tc-1",
    messages: list | None = None,
) -> ToolRuntime:
    return ToolRuntime(
        state={"story_assets": assets or [], "messages": messages or []},
        context=None,
        config={},
        stream_writer=lambda *_a: None,
        tool_call_id=tool_call_id,
        store=None,
    )


def test_is_safe_photo_filename() -> None:
    from agents_app.agents.core.chat.story_assets import is_safe_photo_filename

    assert is_safe_photo_filename(VALID_STYLE)
    assert is_safe_photo_filename(VALID_CONTENT)
    assert not is_safe_photo_filename("not-a-uuid.png")
    assert not is_safe_photo_filename("../etc/passwd.webp")
    assert not is_safe_photo_filename("")


def test_upsert_and_clear_helpers() -> None:
    from agents_app.agents.core.chat.story_assets import (
        MAX_STORY_ASSETS,
        clear_story_asset_list,
        upsert_story_asset_list,
    )

    assets: list = []
    nxt, msg = upsert_story_asset_list(assets, role="style", name=VALID_STYLE, note="warm neon")
    assert nxt is not None
    assert "Saved style" in msg
    assert nxt == [{"role": "style", "name": VALID_STYLE, "note": "warm neon"}]

    nxt2, msg2 = upsert_story_asset_list(nxt, role="style", name=VALID_STYLE, note="cooler")
    assert nxt2 is not None
    assert "Updated style" in msg2
    assert nxt2[0]["note"] == "cooler"

    nxt3, _ = upsert_story_asset_list(nxt2, role="content", name=VALID_CONTENT, note="bowl")
    assert nxt3 is not None
    assert len(nxt3) == 2

    cleared_role, msg_role = clear_story_asset_list(nxt3, role="style")
    assert cleared_role is not None
    assert len(cleared_role) == 1
    assert cleared_role[0]["role"] == "content"
    assert "style" in msg_role

    empty, msg_all = clear_story_asset_list(nxt3, role=None)
    assert empty == []
    assert "Cleared all" in msg_all

    by_name, msg_name = clear_story_asset_list(nxt3, name=VALID_CONTENT)
    assert by_name is not None
    assert len(by_name) == 1
    assert by_name[0]["name"] == VALID_STYLE
    assert VALID_CONTENT in msg_name

    filled = [
        {"role": "style", "name": f"{i:08x}-bbbb-cccc-dddd-eeeeeeeeeeee.webp", "note": ""}
        for i in range(MAX_STORY_ASSETS)
    ]
    overflow, err = upsert_story_asset_list(
        filled,  # type: ignore[arg-type]
        role="content",
        name=VALID_CONTENT,
    )
    assert overflow is None
    assert "at most" in err


def test_merge_generation_references_scratchpad_wins() -> None:
    from agents_app.agents.core.chat.story_assets import merge_generation_references

    assets = [
        {"role": "style", "name": VALID_STYLE, "note": "look"},
        {"role": "content", "name": VALID_CONTENT, "note": "dish"},
    ]
    request = [
        {"type": "photo", "name": VALID_STYLE},  # duplicate — scratchpad already has it
        {"type": "photo", "name": "99999999-aaaa-bbbb-cccc-dddddddddddd.png"},
    ]
    merged = merge_generation_references(story_assets=assets, request_references=request)
    assert merged == [
        {"type": "photo", "name": VALID_STYLE},
        {"type": "photo", "name": VALID_CONTENT},
        {"type": "photo", "name": "99999999-aaaa-bbbb-cccc-dddddddddddd.png"},
    ]


def test_upsert_result_replaces_previous() -> None:
    from agents_app.agents.core.chat.story_assets import (
        clear_story_asset_list,
        merge_generation_references,
        upsert_result_asset,
    )

    first = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
    second = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff.webp"
    assets: list = [{"role": "style", "name": VALID_STYLE, "note": ""}]

    nxt, msg = upsert_result_asset(assets, name=first)
    assert nxt is not None
    assert "Saved result" in msg
    assert [a for a in nxt if a["role"] == "result"] == [
        {"role": "result", "name": first, "note": ""}
    ]

    nxt2, msg2 = upsert_result_asset(nxt, name=second)
    assert nxt2 is not None
    assert "Updated result" in msg2
    results = [a for a in nxt2 if a["role"] == "result"]
    assert len(results) == 1
    assert results[0]["name"] == second

    merged = merge_generation_references(story_assets=nxt2, request_references=None)
    assert merged == [
        {"type": "photo", "name": VALID_STYLE},
        {"type": "previous-result", "filename": second},
    ]

    cleared, _ = clear_story_asset_list(nxt2, role="result")
    assert cleared is not None
    assert all(a["role"] != "result" for a in cleared)


def test_attached_media_library_names_from_messages() -> None:
    from agents_app.agents.core.chat.story_assets import (
        attached_media_library_names_from_messages,
    )

    msg = _attached_user_message(VALID_STYLE, VALID_CONTENT)
    assert attached_media_library_names_from_messages([msg]) == {VALID_STYLE, VALID_CONTENT}
    assert attached_media_library_names_from_messages([]) == set()
    assert attached_media_library_names_from_messages(
        [HumanMessage(content="no attach section")]
    ) == set()


def test_save_story_asset_tool_returns_command_with_json() -> None:
    from agents_app.agents.core.chat.story_assets import save_story_asset

    result = save_story_asset.invoke(
        {
            "role": "style",
            "name": VALID_STYLE,
            "note": "editorial",
            "runtime": _runtime(messages=[_attached_user_message(VALID_STYLE)]),
        }
    )
    assert isinstance(result, Command)
    assert result.update is not None
    assert result.update["story_assets"] == [
        {"role": "style", "name": VALID_STYLE, "note": "editorial"}
    ]
    payload = json.loads(result.update["messages"][0].content)
    assert payload["ok"] is True
    assert payload["action"] == "save"
    assert payload["story_assets"] == result.update["story_assets"]
    assert "Saved style" in payload["message"]


def test_save_story_asset_rejects_unsafe_name() -> None:
    from agents_app.agents.core.chat.story_assets import save_story_asset

    result = save_story_asset.invoke(
        {
            "role": "content",
            "name": "raw-upload.png",
            "runtime": _runtime(messages=[_attached_user_message(VALID_STYLE)]),
        }
    )
    assert isinstance(result, str)
    payload = json.loads(result)
    assert payload["ok"] is False
    assert payload["message"].startswith("Error:")
    assert "Attached media library photos" in payload["message"]


def test_save_story_asset_rejects_name_not_in_attached_section() -> None:
    from agents_app.agents.core.chat.story_assets import save_story_asset

    # Valid uuid filename, but never @-attached in this chat.
    result = save_story_asset.invoke(
        {
            "role": "content",
            "name": VALID_CONTENT,
            "runtime": _runtime(messages=[_attached_user_message(VALID_STYLE)]),
        }
    )
    assert isinstance(result, str)
    payload = json.loads(result)
    assert payload["ok"] is False
    assert "Attached media library photos" in payload["message"]


def test_save_story_asset_rejects_when_no_attachments() -> None:
    from agents_app.agents.core.chat.story_assets import save_story_asset

    result = save_story_asset.invoke(
        {
            "role": "content",
            "name": VALID_CONTENT,
            "runtime": _runtime(messages=[HumanMessage(content="make a story")]),
        }
    )
    assert isinstance(result, str)
    payload = json.loads(result)
    assert payload["ok"] is False
    assert "skip saving content" in payload["message"].lower() or "Attached" in payload["message"]


def test_clear_story_assets_tool_by_role() -> None:
    from agents_app.agents.core.chat.story_assets import clear_story_assets

    result = clear_story_assets.invoke(
        {
            "role": "content",
            "runtime": _runtime(
                assets=[
                    {"role": "style", "name": VALID_STYLE, "note": ""},
                    {"role": "content", "name": VALID_CONTENT, "note": ""},
                ]
            ),
        }
    )
    assert isinstance(result, Command)
    assert result.update is not None
    assert result.update["story_assets"] == [{"role": "style", "name": VALID_STYLE, "note": ""}]
    payload = json.loads(result.update["messages"][0].content)
    assert payload["ok"] is True
    assert payload["action"] == "clear"
    assert payload["story_assets"] == result.update["story_assets"]


def test_clear_story_assets_tool_by_name() -> None:
    from agents_app.agents.core.chat.story_assets import clear_story_assets

    result = clear_story_assets.invoke(
        {
            "name": VALID_STYLE,
            "runtime": _runtime(
                assets=[
                    {"role": "style", "name": VALID_STYLE, "note": ""},
                    {"role": "content", "name": VALID_CONTENT, "note": ""},
                ]
            ),
        }
    )
    assert isinstance(result, Command)
    assert result.update is not None
    assert result.update["story_assets"] == [
        {"role": "content", "name": VALID_CONTENT, "note": ""}
    ]
