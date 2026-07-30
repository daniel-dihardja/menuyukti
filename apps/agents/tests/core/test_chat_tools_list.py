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
    assert "list_media_collections" in names
    assert "list_media" in names
    assert "get_workflow_overview" not in names
    assert "get_milestone" not in names
    assert "update_milestone_input" not in names
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


def test_chat_tools_list_omits_location_without_location_id() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list

    names = [getattr(t, "name", "") for t in chat_tools_list(location_id=False)]
    assert "get_location_data" not in names
    assert "get_chart_data" not in names
    assert "list_media_collections" in names
    assert "list_media" in names


def test_chat_tools_list_from_config_gates_by_context() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list_from_config

    agent_only = chat_tools_list_from_config({"user_id": "u1"})
    agent_names = [getattr(t, "name", "") for t in agent_only]
    assert "get_milestone" not in agent_names
    assert "get_location_data" not in agent_names
    assert "get_chart_data" not in agent_names
    assert "generate_instagram_post_image" not in agent_names
    assert "list_media_collections" in agent_names
    assert "list_media" in agent_names

    with_location = chat_tools_list_from_config(
        {"location_id": 7, "user_id": "u1"}
    )
    with_location_names = [getattr(t, "name", "") for t in with_location]
    assert "get_milestone" not in with_location_names
    assert "update_milestone_input" not in with_location_names
    assert "get_location_data" in with_location_names
    assert "get_chart_data" in with_location_names
    assert "generate_instagram_post_image" not in with_location_names

    agent_thread = chat_tools_list_from_config(
        {"agent_thread_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", "location_id": 7, "user_id": "u1"}
    )
    agent_thread_names = [getattr(t, "name", "") for t in agent_thread]
    assert "generate_instagram_post_image" in agent_thread_names
    assert "get_location_data" in agent_thread_names
    assert "get_milestone" not in agent_thread_names

    ig_studio = chat_tools_list_from_config({"user_id": "u1", "post_id": "10", "page_id": "20"})
    ig_names = [getattr(t, "name", "") for t in ig_studio]
    assert "generate_instagram_post_image" in ig_names
    assert "get_milestone" not in ig_names


def test_compile_chat_graph_uses_tool_node_with_handle_tool_errors() -> None:
    from agents_app.agents.core.chat.graph import compile_chat_graph
    from agents_app.agents.core.chat.state import ChatAgentState
    from langgraph.prebuilt.tool_node import ToolNode

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
    assert "save_story_asset" in tool_node.tools_by_name
    assert "clear_story_assets" in tool_node.tools_by_name
    assert "request_story_generate_confirmation" in tool_node.tools_by_name
    assert "story_assets" in ChatAgentState.__annotations__
