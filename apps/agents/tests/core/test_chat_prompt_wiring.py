"""Tests for chat graph prompt wiring."""

from unittest.mock import patch

from agents_app.agents.core.chat.graph import _chat_prompt
from langchain_core.messages import HumanMessage


def test_chat_prompt_without_catalog_config() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {}},
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert "## Workflow milestone catalog" not in messages[0].content
    assert "## Workflow chart catalog" not in messages[0].content
    assert "get_milestone" not in messages[0].content
    assert "Instagram content assistant" in messages[0].content


def test_chat_prompt_injects_chart_catalog_when_location_present() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {"location_id": 3}},
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert "## Workflow chart catalog" in messages[0].content
    assert "pair_lift_matrix_heatmap" in messages[0].content
