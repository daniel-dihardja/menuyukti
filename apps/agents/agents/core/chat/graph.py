"""LangGraph chat graph: ReAct agent with get_milestone_data and short-term checkpoint memory."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.tools import get_milestone_data
from agents_app.models.llm_config import get_llm
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig, RunnableLambda
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent


def _chat_prompt_with_milestone_help(
    state: dict[str, Any],
    config: RunnableConfig,
) -> list[BaseMessage]:
    """Prepend system prompt; append translated milestone Help text when present in config."""
    base = build_system_prompt()
    configurable = config.get("configurable") or {}
    raw_help = configurable.get("milestone_help_text")
    if isinstance(raw_help, str) and raw_help.strip():
        combined = (
            base + "\n\n## Selected milestone (product Help tab)\n" + raw_help.strip()
        )
    else:
        combined = base
    messages = state.get("messages") or []
    return [SystemMessage(content=combined), *messages]


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; milestone context via config)."""
    llm = get_llm()
    prompt_runnable = RunnableLambda(_chat_prompt_with_milestone_help)
    return create_react_agent(
        llm,
        [get_milestone_data],
        prompt=prompt_runnable,
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
