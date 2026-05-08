"""LangGraph chat graph: ReAct agent with get_milestone_data and short-term checkpoint memory."""

from __future__ import annotations

from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.tools import get_milestone_data
from agents_app.models.llm_config import get_llm
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; milestone context via config)."""
    llm = get_llm()
    prompt_text = build_system_prompt()
    return create_react_agent(
        llm,
        [get_milestone_data],
        prompt=prompt_text,
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
