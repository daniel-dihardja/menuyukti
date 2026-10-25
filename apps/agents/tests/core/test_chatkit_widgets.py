"""Unit tests for ChatKit advisor widgets and bridge helpers."""

from __future__ import annotations

from agents_app.agents.core.chatkit.bridge import (
    _compact_status_for_tool,
    _image_url_from_tool_output,
    _is_rejected_story_asset_save,
)
from agents_app.agents.core.chatkit.widgets import (
    generated_image_widget,
    story_confirm_widget,
    tool_status_widget,
    weekly_schedule_widget,
)


def test_story_confirm_widget_actions() -> None:
    card = story_confirm_widget(message="Ready?")
    text = str(card.model_dump(mode="json"))
    assert "story.generate" in text
    assert "story.change" in text
    assert "Ready?" in text


def test_weekly_schedule_widget_client_actions_and_days() -> None:
    payload = {
        "title": "Week plan",
        "summary": "Busy week",
        "days": [
            {
                "day": "monday",
                "time": "10:00",
                "format": "story",
                "menu_items": "Ramen",
                "caption_angle": "Steam shot",
                "why": "Peak lunch",
            }
        ],
    }
    card = weekly_schedule_widget(payload)
    text = str(card.model_dump(mode="json"))
    assert "Week plan" in text
    assert "monday" in text.lower() or "Monday" in text
    assert "schedule.export_ics" in text
    assert "schedule.share" in text
    assert '"handler": "client"' in text or "'handler': 'client'" in text or "client" in text


def test_generated_image_widget() -> None:
    card = generated_image_widget(url="https://cdn.example/a.webp", caption="Bowl")
    dumped = card.model_dump(mode="json")
    text = str(dumped)
    assert "https://cdn.example/a.webp" in text
    assert "Bowl" in text


def test_tool_status_widget() -> None:
    card = tool_status_widget(title="Chart data ready", detail="menu_item_heatmap", tone="ok")
    assert "Chart data ready" in str(card.model_dump(mode="json"))


def test_image_url_and_rejected_save_helpers() -> None:
    assert _image_url_from_tool_output('{"url":"https://x/y.webp"}') == "https://x/y.webp"
    assert _is_rejected_story_asset_save('{"ok":false,"action":"save"}') is True
    assert _is_rejected_story_asset_save('{"ok":true,"action":"save"}') is False


def test_compact_status_skips_rejected_save() -> None:
    assert (
        _compact_status_for_tool(
            "save_story_asset",
            output='{"ok":false,"action":"save"}',
            tool_input={},
        )
        is None
    )
    widget = _compact_status_for_tool(
        "get_chart_data",
        output="ok",
        tool_input={"chart_id": "menu_item_heatmap"},
    )
    assert widget is not None
    assert "Menu item heatmap" in str(widget.model_dump(mode="json"))
