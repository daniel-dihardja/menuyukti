"""Chat ReAct tool list (includes optional Tavily ``search_web``)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest


@pytest.fixture(autouse=True)
def _clear_tavily_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)


def test_chat_tools_list_excludes_search_web_without_key() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list()]
    assert "search_web" not in names
    assert "generate_instagram_post_image" not in names
    # ToolNode full union still includes legacy workflow tools when flags are True.
    assert "get_workflow_overview" in names
    assert "get_milestone" in names
    assert "list_instagram_items" in names
    assert "get_instagram_item" in names
    assert "create_instagram_items" in names
    assert "update_instagram_items" in names
    assert "delete_instagram_items" in names
    assert "update_milestone_input" in names
    assert "get_location_data" in names
    assert "get_chart_data" in names


def test_chat_tools_list_includes_search_web_with_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    with patch("agents_app.agents.core.tavily_search_tool.TavilySearch") as mock_cls:
        mock_cls.return_value.ainvoke = AsyncMock(return_value={"results": []})
        from agents_app.agents.core.chat.graph import chat_tools_list

        names = [getattr(t, "name", "") for t in chat_tools_list()]
    assert "search_web" in names


def test_chat_tools_list_includes_post_image_when_requested() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(include_post_image=True)]
    assert "generate_instagram_post_image" in names


def test_chat_tools_list_omits_workflow_tools_without_workflow() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(workflow_id=False)]
    assert "get_workflow_overview" not in names
    assert "get_milestone" not in names
    assert "list_instagram_items" not in names
    assert "get_instagram_item" not in names
    assert "create_instagram_items" not in names
    assert "update_instagram_items" not in names
    assert "delete_instagram_items" not in names
    assert "update_milestone_input" not in names
    assert "get_location_data" in names
    assert "get_chart_data" in names


def test_chat_tools_list_omits_update_without_milestone() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [
        getattr(t, "name", "")
        for t in chat_tools_list(workflow_id=True, milestone_id=False)
    ]
    assert "get_milestone" in names
    assert "list_instagram_items" in names
    assert "get_instagram_item" in names
    assert "create_instagram_items" in names
    assert "update_instagram_items" in names
    assert "delete_instagram_items" in names
    assert "update_milestone_input" not in names


def test_chat_tools_list_omits_location_without_location_id() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(location_id=False)]
    assert "get_location_data" not in names
    assert "get_chart_data" not in names


def test_chat_tools_list_from_config_never_binds_workflow_mutation_tools() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list_from_config

    agent_only = chat_tools_list_from_config({"user_id": "u1"})
    agent_names = [getattr(t, "name", "") for t in agent_only]
    assert "get_milestone" not in agent_names
    assert "get_location_data" not in agent_names
    assert "get_chart_data" not in agent_names

    wf = chat_tools_list_from_config(
        {"workflow_id": "100", "location_id": 7, "user_id": "u1"}
    )
    wf_names = [getattr(t, "name", "") for t in wf]
    assert "get_milestone" not in wf_names
    assert "get_workflow_overview" not in wf_names
    assert "list_instagram_items" not in wf_names
    assert "get_instagram_item" not in wf_names
    assert "create_instagram_items" not in wf_names
    assert "update_instagram_items" not in wf_names
    assert "delete_instagram_items" not in wf_names
    assert "update_milestone_input" not in wf_names
    assert "get_location_data" in wf_names
    assert "get_chart_data" in wf_names

    selected = chat_tools_list_from_config(
        {
            "workflow_id": "100",
            "milestone_id": "42",
            "location_id": 7,
            "user_id": "u1",
        }
    )
    selected_names = [getattr(t, "name", "") for t in selected]
    assert "update_milestone_input" not in selected_names
    assert "get_instagram_item" not in selected_names
    assert "create_instagram_items" not in selected_names
    assert "delete_instagram_items" not in selected_names
    assert "get_location_data" in selected_names
    assert "get_chart_data" in selected_names


def test_chat_tools_list_from_config_binds_post_image_for_ig_studio() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list_from_config

    names = [
        getattr(t, "name", "")
        for t in chat_tools_list_from_config(
            {
                "location_id": 7,
                "post_id": "post-1",
                "page_id": "page-1",
                "user_id": "u1",
            }
        )
    ]
    assert "generate_instagram_post_image" in names
    assert "get_chart_data" in names
    assert "create_instagram_items" not in names


def test_compile_chat_graph_uses_tool_node_with_handle_tool_errors() -> None:
    from langgraph.prebuilt.tool_node import ToolNode

    from agents_app.agents.core.chat.graph import compile_chat_graph

    graph = compile_chat_graph(checkpointer=None)
    tools_node = graph.nodes.get("tools")
    assert tools_node is not None
    # RunnableCallable / PregelNode wraps ToolNode; unwrap to the node instance.
    bound = getattr(tools_node, "bound", tools_node)
    node = getattr(bound, "afunc", None) or getattr(bound, "func", None) or bound
    tool_node = node.__self__ if hasattr(node, "__self__") else node
    if not isinstance(tool_node, ToolNode):
        # LangGraph may nest differently by version — inspect known attributes.
        tool_node = getattr(tools_node, "tools_by_name", None) and tools_node
    assert isinstance(tool_node, ToolNode)
    assert tool_node._handle_tool_errors is True
