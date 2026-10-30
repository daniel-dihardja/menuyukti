"""Tests for chat graph prompt wiring."""

from unittest.mock import patch

from agents_app.agents.core.chat.middleware import chat_system_prompt_from_config


def test_chat_prompt_without_catalog_config() -> None:
    with patch(
        "agents_app.agents.core.chat.middleware.get_config",
        return_value={"configurable": {}},
    ):
        content = chat_system_prompt_from_config()

    assert "## Workflow milestone catalog" not in content
    assert "## Workflow chart catalog" not in content
    assert "get_milestone" not in content
    assert "advisor for restaurant owners" in content
    assert "## Location situation (default)" in content
    assert "No sales report is attached" in content
    assert "## Knowledge search" in content
    assert "search_knowledge" in content
    assert "get_advisor_memory" not in content
    assert "get_location_data" not in content


def test_chat_prompt_omits_chart_catalog_when_only_location_present() -> None:
    with patch(
        "agents_app.agents.core.chat.middleware.get_config",
        return_value={"configurable": {"location_id": 3}},
    ):
        content = chat_system_prompt_from_config()

    assert "## Workflow chart catalog" not in content
    assert "No sales report is attached" in content
    assert "## Advisor memory" in content
    assert "get_advisor_memory" in content
    assert "get_location_data" in content
    assert "Call `get_advisor_memory` when" in content
    assert "Skip `get_advisor_memory` when" in content


def test_chat_prompt_injects_chart_catalog_when_analytics_run_present() -> None:
    with patch(
        "agents_app.agents.core.chat.middleware.get_config",
        return_value={"configurable": {"location_id": 3, "analytics_run_id": 9}},
    ):
        content = chat_system_prompt_from_config()

    assert "## Workflow chart catalog" in content
    assert "## Chart analytics" in content
    assert "## Menu COGS" in content
    assert "list_menu_item_cogs" in content
    assert "request_cogs_edit" in content
    assert "pair_lift_matrix_heatmap" in content
    assert "weak_review" in content
    assert "weak items" in content.lower()
    assert "core three" in content
    assert "No sales report is attached" not in content
    assert "## Advisor memory" in content
    assert "Call `search_knowledge` when" in content
