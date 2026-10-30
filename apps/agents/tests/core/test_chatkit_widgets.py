"""Unit tests for ChatKit advisor widgets and bridge helpers."""

from __future__ import annotations

from agents_app.agents.core.chatkit.bridge import (
    _chart_status_detail,
    _cogs_edit_form_widget_from_tool_output,
    _cogs_list_widget_from_tool_output,
    _compact_status_for_tool,
    _image_url_from_tool_output,
    _is_rejected_story_asset_save,
    _progress_for_tool_start,
    _running_status_for_tool,
)
from agents_app.agents.core.chatkit.widgets import (
    cogs_edit_form_widget,
    cogs_list_widget,
    generated_image_widget,
    story_confirm_widget,
    tool_status_widget,
)


def test_story_confirm_widget_actions() -> None:
    card = story_confirm_widget(message="Ready?")
    text = str(card.model_dump(mode="json"))
    assert "story.generate" in text
    assert "story.change" in text
    assert "Ready?" in text


def test_generated_image_widget() -> None:
    card = generated_image_widget(url="https://cdn.example/a.webp", caption="Bowl")
    dumped = card.model_dump(mode="json")
    text = str(dumped)
    assert "https://cdn.example/a.webp" in text
    assert "Bowl" in text


def test_tool_status_widget() -> None:
    card = tool_status_widget(title="Chart data ready", detail="menu_item_heatmap", tone="ok")
    assert "Chart data ready" in str(card.model_dump(mode="json"))


def test_cogs_list_widget() -> None:
    card = cogs_list_widget(
        [
            {"menu": "Nasi Goreng", "cogs": None, "status": "missing"},
            {"menu": "Es Teh", "cogs": 1500, "currency": "IDR", "status": "set"},
        ],
        missing_count=1,
        total_count=2,
        run_name="Jan",
    )
    text = str(card.model_dump(mode="json"))
    assert "Menu COGS" in text
    assert "Report: Jan" in text
    assert "Missing" in text
    assert "1500 IDR" in text
    assert "1 missing" in text
    assert card.model_dump(mode="json").get("size") == "lg"


def test_cogs_list_widget_from_tool_output() -> None:
    payload = (
        '{"ok":true,"summary":{"total":1,"missing_count":1,"run_name":"R1"},'
        '"items":[{"menu":"A","cogs":null,"status":"missing"}],"markdown":"x"}'
    )
    widget = _cogs_list_widget_from_tool_output(payload)
    assert widget is not None
    assert "Missing" in str(widget.model_dump(mode="json"))
    assert _cogs_list_widget_from_tool_output("Error running list_menu_item_cogs") is None


def test_cogs_edit_form_widget_has_inputs() -> None:
    card = cogs_edit_form_widget(
        [
            {"menu": "Nasi Goreng", "cogs": None, "status": "missing"},
            {"menu": "Es Teh", "cogs": 1500, "currency": "IDR", "status": "set"},
        ],
        run_name="Jan",
    )
    dumped = card.model_dump(mode="json")
    text = str(dumped)
    assert "Edit menu COGS" in text
    assert "Report: Jan" in text
    assert dumped.get("size") == "full"
    assert "75%" in text
    assert "cogs_0" in text
    assert "cogs_1" in text
    assert "inputType" in text or '"type": "Input"' in text
    assert "cogs.edit_ack" in text
    assert "1500" in text


def test_cogs_edit_form_widget_from_tool_output() -> None:
    payload = (
        '{"ok":true,"action":"request_cogs_edit","run_name":"R1","truncated":false,'
        '"items":[{"menu":"A","cogs":null,"status":"missing"}]}'
    )
    widget = _cogs_edit_form_widget_from_tool_output(payload)
    assert widget is not None
    assert "cogs_0" in str(widget.model_dump(mode="json"))
    assert _cogs_edit_form_widget_from_tool_output('{"ok":true,"items":[]}') is None


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


def test_chart_status_uses_input_and_output_fallback() -> None:
    title, detail = _chart_status_detail(
        {"chart_id": "weak_review"},
        "ok",
    )
    assert title == "Loaded Weak items review"
    assert detail == "weak_review"

    # tool_end historically had no input — recover from markdown heading
    title2, detail2 = _chart_status_detail(
        None,
        "## Visualization data — Weak items review\n- dogs",
    )
    assert title2 == "Loaded Weak items review"
    assert detail2 == "weak_review"

    title3, _ = _chart_status_detail(None, "ok")
    assert title3 == "Chart data ready"


def test_running_status_and_progress_name_the_chart() -> None:
    text, icon = _progress_for_tool_start(
        "get_chart_data",
        {"chart_id": "weak_review"},
    )
    assert text == "Loading Weak items review…"
    assert icon == "chart"

    running = _running_status_for_tool(
        "get_chart_data",
        {"chart_id": "weak_review"},
    )
    assert running is not None
    dumped = str(running.model_dump(mode="json"))
    assert "Loading Weak items review" in dumped
    assert "→" in dumped


def test_running_status_for_list_menu_item_cogs() -> None:
    text, icon = _progress_for_tool_start("list_menu_item_cogs", {})
    assert text == "Loading menu COGS…"
    assert icon == "analytics"
    running = _running_status_for_tool("list_menu_item_cogs", {})
    assert running is not None
    assert "Loading menu COGS" in str(running.model_dump(mode="json"))
    done = _compact_status_for_tool(
        "list_menu_item_cogs",
        output='{"ok":true,"items":[]}',
        tool_input={},
    )
    assert done is not None
    assert "Loaded menu COGS" in str(done.model_dump(mode="json"))


def test_running_status_for_request_cogs_edit() -> None:
    text, icon = _progress_for_tool_start("request_cogs_edit", {})
    assert text == "Preparing COGS edit form…"
    assert icon == "analytics"
    running = _running_status_for_tool("request_cogs_edit", {})
    assert running is not None
    assert "Preparing COGS edit form" in str(running.model_dump(mode="json"))
