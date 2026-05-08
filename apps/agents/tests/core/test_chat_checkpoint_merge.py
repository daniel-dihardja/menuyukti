"""LangGraph checkpointer merges incremental user messages on the same thread_id."""

import pytest
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import MessagesState


async def _append_ai(state: MessagesState) -> dict:
    return {"messages": [AIMessage(content="ok")]}


@pytest.mark.asyncio
async def test_incremental_messages_merge_in_thread() -> None:
    checkpointer = InMemorySaver()
    builder = StateGraph(MessagesState)
    builder.add_node("reply", _append_ai)
    builder.add_edge(START, "reply")
    builder.add_edge("reply", END)
    graph = builder.compile(checkpointer=checkpointer)

    config = {"configurable": {"thread_id": "t-merge"}}
    await graph.ainvoke({"messages": [HumanMessage(content="first")]}, config)
    out = await graph.ainvoke({"messages": [HumanMessage(content="second")]}, config)

    assert len(out["messages"]) >= 4
    types = [type(m).__name__ for m in out["messages"]]
    assert types.count("HumanMessage") == 2
    assert types.count("AIMessage") == 2
