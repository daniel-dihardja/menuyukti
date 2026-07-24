"""Tests for chat graph prompt wiring with injected catalog."""

from unittest.mock import patch

from agents_app.agents.core.chat.graph import _chat_prompt
from langchain_core.messages import HumanMessage


def test_chat_prompt_injects_catalog_from_config() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={
            "configurable": {
                "workflow_catalog_markdown": "# Workflow overview\n\n## 1. Brief\n",
                "location_id": 7,
            }
        },
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert len(messages) == 2
    assert messages[0].type == "system"
    assert "## Workflow milestone catalog" in messages[0].content
    assert "# Workflow overview" in messages[0].content
    assert "## Workflow chart catalog" in messages[0].content
    assert messages[1].content == "hi"


def test_chat_prompt_without_catalog_config() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {}},
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert "## Workflow milestone catalog" not in messages[0].content
    assert "## Workflow chart catalog" not in messages[0].content
    assert "source of truth" in messages[0].content
    assert "Instagram content assistant" in messages[0].content


def test_chat_prompt_injects_chart_catalog_when_location_present() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {"location_id": 3}},
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert "## Workflow chart catalog" in messages[0].content
    assert "pair_lift_matrix_heatmap" in messages[0].content
