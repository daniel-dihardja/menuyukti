"""Unit tests for Story asset scratchpad helpers and tools."""

from __future__ import annotations

import json

from langchain.tools import ToolRuntime
from langgraph.types import Command

VALID_STYLE = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
VALID_PRODUCT = "11111111-2222-3333-4444-555555555555.jpg"


def _runtime(*, assets: list | None = None, tool_call_id: str = "tc-1") -> ToolRuntime:
    return ToolRuntime(
        state={"story_assets": assets or []},
        context=None,
        config={},
        stream_writer=lambda *_a: None,
        tool_call_id=tool_call_id,
        store=None,
    )


def test_is_safe_photo_filename() -> None:
    from agents_app.agents.core.chat.story_assets import is_safe_photo_filename

    assert is_safe_photo_filename(VALID_STYLE)
    assert is_safe_photo_filename(VALID_PRODUCT)
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

    nxt3, _ = upsert_story_asset_list(nxt2, role="product", name=VALID_PRODUCT, note="bowl")
    assert nxt3 is not None
    assert len(nxt3) == 2

    cleared_role, msg_role = clear_story_asset_list(nxt3, role="style")
    assert cleared_role is not None
    assert len(cleared_role) == 1
    assert cleared_role[0]["role"] == "product"
    assert "style" in msg_role

    empty, msg_all = clear_story_asset_list(nxt3, role=None)
    assert empty == []
    assert "Cleared all" in msg_all

    by_name, msg_name = clear_story_asset_list(nxt3, name=VALID_PRODUCT)
    assert by_name is not None
    assert len(by_name) == 1
    assert by_name[0]["name"] == VALID_STYLE
    assert VALID_PRODUCT in msg_name

    filled = [
        {"role": "style", "name": f"{i:08x}-bbbb-cccc-dddd-eeeeeeeeeeee.webp", "note": ""}
        for i in range(MAX_STORY_ASSETS)
    ]
    overflow, err = upsert_story_asset_list(
        filled,  # type: ignore[arg-type]
        role="product",
        name=VALID_PRODUCT,
    )
    assert overflow is None
    assert "at most" in err


def test_merge_generation_references_scratchpad_wins() -> None:
    from agents_app.agents.core.chat.story_assets import merge_generation_references

    assets = [
        {"role": "style", "name": VALID_STYLE, "note": "look"},
        {"role": "product", "name": VALID_PRODUCT, "note": "dish"},
    ]
    request = [
        {"type": "photo", "name": VALID_STYLE},  # duplicate — scratchpad already has it
        {"type": "photo", "name": "99999999-aaaa-bbbb-cccc-dddddddddddd.png"},
    ]
    merged = merge_generation_references(story_assets=assets, request_references=request)
    assert merged == [
        {"type": "photo", "name": VALID_STYLE},
        {"type": "photo", "name": VALID_PRODUCT},
        {"type": "photo", "name": "99999999-aaaa-bbbb-cccc-dddddddddddd.png"},
    ]


def test_save_story_asset_tool_returns_command_with_json() -> None:
    from agents_app.agents.core.chat.story_assets import save_story_asset

    result = save_story_asset.invoke(
        {
            "role": "style",
            "name": VALID_STYLE,
            "note": "editorial",
            "runtime": _runtime(),
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
        {"role": "product", "name": "raw-upload.png", "runtime": _runtime()}
    )
    assert isinstance(result, str)
    payload = json.loads(result)
    assert payload["ok"] is False
    assert payload["message"].startswith("Error:")


def test_clear_story_assets_tool_by_role() -> None:
    from agents_app.agents.core.chat.story_assets import clear_story_assets

    result = clear_story_assets.invoke(
        {
            "role": "product",
            "runtime": _runtime(
                assets=[
                    {"role": "style", "name": VALID_STYLE, "note": ""},
                    {"role": "product", "name": VALID_PRODUCT, "note": ""},
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
                    {"role": "product", "name": VALID_PRODUCT, "note": ""},
                ]
            ),
        }
    )
    assert isinstance(result, Command)
    assert result.update is not None
    assert result.update["story_assets"] == [
        {"role": "product", "name": VALID_PRODUCT, "note": ""}
    ]
