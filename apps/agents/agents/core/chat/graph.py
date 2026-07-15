"""LangGraph chat graph: ReAct agent with get_milestone_data and short-term checkpoint memory."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.tools import (
    get_location_data,
    get_milestone_data,
    get_milestone_help,
    get_milestone_input_json,
    get_milestone_preset_data_json,
    get_workflow_overview,
    update_milestone_input,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.config import get_config
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent

# Max tool/model turns per request (ReAct loop budget).
CHAT_RECURSION_LIMIT = 20


def chat_tools_list() -> list:
    """Build chat ReAct tools (optional ``search_web`` when ``TAVILY_API_KEY`` is set)."""
    tools: list = [
        get_workflow_overview,
        get_milestone_data,
        get_milestone_help,
        get_milestone_input_json,
        get_milestone_preset_data_json,
        update_milestone_input,
        get_location_data,
    ]
    web = make_search_web_tool()
    if web is not None:
        tools.append(web)
    return tools


def _chat_prompt(state: dict[str, Any]) -> list[BaseMessage]:
    """Prepend the chat system prompt."""
    messages = state.get("messages") or []
    prompt_body = build_system_prompt()
    return [SystemMessage(content=prompt_body), *messages]


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; milestone context via config)."""
    # Resolve tools at compile time so ``load_dotenv()`` in ``server.py`` has already run.
    tools = chat_tools_list()

    def _select_chat_model(_state: dict[str, Any], _runtime: Any) -> Any:
        """Resolve LLM from RunnableConfig (set by HTTP router when client picks a model)."""
        cfg = get_config() or {}
        conf = cfg.get("configurable") or {}
        raw = conf.get("chat_gateway_model")
        gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
        llm = chat_llm_for_gateway_model(gateway, streaming=True)
        return llm.bind_tools(tools)

    return create_react_agent(  # type: ignore[type-var]
        _select_chat_model,
        tools,
        prompt=_chat_prompt,
        checkpointer=checkpointer,
        name="menuyukti_chat",
    )


def incremental_user_message(messages: list[dict[str, str]]) -> HumanMessage:
    """Validate the request carries exactly one new user message (checkpoint supplies prior turns)."""
    if len(messages) != 1:
        msg = "Expected exactly one user message per request"
        raise ValueError(msg)
    m = messages[0]
    role = m["role"]
    content = m["content"]
    if role != "user":
        msg = f"Message must be user role, got {role}"
        raise ValueError(msg)
    return HumanMessage(content=content)
