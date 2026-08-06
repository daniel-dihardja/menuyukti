"""Tests for chat graph prompt wiring."""

from unittest.mock import patch

from agents_app.agents.core.chat.graph import _chat_system_prompt_from_config


def test_chat_prompt_without_catalog_config() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {}},
    ):
        content = _chat_system_prompt_from_config()

    assert "## Workflow milestone catalog" not in content
    assert "## Workflow chart catalog" not in content
    assert "get_milestone" not in content
    assert "Instagram content assistant" in content
    assert "No sales report is attached" in content


def test_chat_prompt_omits_chart_catalog_when_only_location_present() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {"location_id": 3}},
    ):
        content = _chat_system_prompt_from_config()

    assert "## Workflow chart catalog" not in content
    assert "No sales report is attached" in content


def test_chat_prompt_injects_chart_catalog_when_analytics_run_present() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {"location_id": 3, "analytics_run_id": 9}},
    ):
        content = _chat_system_prompt_from_config()

    assert "## Workflow chart catalog" in content
    assert "pair_lift_matrix_heatmap" in content
    assert "No sales report is attached" not in content
