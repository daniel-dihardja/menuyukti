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
            }
        },
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert len(messages) == 2
    assert messages[0].type == "system"
    assert "## Workflow milestone catalog" in messages[0].content
    assert "# Workflow overview" in messages[0].content
    assert messages[1].content == "hi"


def test_chat_prompt_without_catalog_config() -> None:
    with patch(
        "agents_app.agents.core.chat.graph.get_config",
        return_value={"configurable": {}},
    ):
        messages = _chat_prompt({"messages": [HumanMessage(content="hi")]})

    assert "## Workflow milestone catalog" not in messages[0].content
    assert "use it as the source of truth" in messages[0].content
