"""LangGraph chat graph (single LLM node or ReAct agent with get_milestone_data tool)."""

from __future__ import annotations

import httpx
from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.models.llm_config import get_llm
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import MessagesState
from langgraph.prebuilt import create_react_agent


async def _chat_node(state: MessagesState) -> dict[str, list[BaseMessage]]:
    """Stream tokens from the model; LangGraph surfaces them via astream_events."""
    llm = get_llm()
    system = SystemMessage(content=build_system_prompt())
    messages: list[BaseMessage] = [system, *state["messages"]]
    full_content = ""
    async for chunk in llm.astream(messages):
        text = chunk.content
        if isinstance(text, str):
            full_content += text
        elif isinstance(text, list):
            # Multimodal / block content: best-effort string concat
            full_content += "".join(str(part) for part in text)
    return {"messages": [AIMessage(content=full_content)]}


def build_chat_graph(
    workflow_id: str | None = None,
    milestone_id: str | None = None,
    *,
    location_id: int | None = None,
    user_id: str | None = None,
    http_client: httpx.AsyncClient | None = None,
):
    """Compile a stateless chat graph (no checkpointer).

    When ``milestone_id``, ``location_id``, ``user_id``, and ``http_client`` are all set,
    returns a ReAct agent with ``get_milestone_data``; otherwise a single LLM node.

    ``workflow_id`` is accepted for API compatibility but not used in the prompt yet.
    """
    _ = workflow_id  # reserved for future steps
    has_milestone_tool = bool(
        milestone_id and location_id is not None and user_id and http_client is not None,
    )
    if has_milestone_tool and http_client is not None and user_id is not None:
        from agents_app.agents.core.chat.tools import make_get_milestone_data_tool

        tool = make_get_milestone_data_tool(
            milestone_id,
            location_id,
            user_id,
            client=http_client,
        )
        llm = get_llm()
        prompt_text = build_system_prompt()
        return create_react_agent(llm, [tool], prompt=prompt_text)

    builder = StateGraph(MessagesState)
    builder.add_node("chat", _chat_node)
    builder.add_edge(START, "chat")
    builder.add_edge("chat", END)
    return builder.compile()


def messages_from_roles(messages: list[dict[str, str]]) -> list[BaseMessage]:
    """Map API message dicts to LangChain messages (user / assistant only)."""
    out: list[BaseMessage] = []
    for m in messages:
        role = m["role"]
        content = m["content"]
        if role == "user":
            out.append(HumanMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
        else:
            msg = f"Invalid message role: {role}"
            raise ValueError(msg)
    return out
