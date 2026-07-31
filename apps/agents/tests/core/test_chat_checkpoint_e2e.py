"""End-to-end InMemorySaver round-trip with the real chat graph (mocked LLM)."""

from __future__ import annotations

from typing import Any
from unittest.mock import patch

import pytest
from agents_app.agents.core.chat.graph import compile_chat_graph
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver


class _FakeLLM:
    """Minimal streaming chat model stand-in for create_agent model override."""

    def __init__(self, responses: list[AIMessage]) -> None:
        self._responses = list(responses)
        self._i = 0

    def bind_tools(self, tools: Any, **kwargs: Any) -> _FakeLLM:
        return self

    async def ainvoke(self, messages: Any, config: Any = None, **kwargs: Any) -> AIMessage:
        if self._i >= len(self._responses):
            return AIMessage(content="done")
        msg = self._responses[self._i]
        self._i += 1
        return msg

    async def astream(self, messages: Any, config: Any = None, **kwargs: Any):
        msg = await self.ainvoke(messages, config=config, **kwargs)
        yield msg


@pytest.mark.asyncio
async def test_compile_chat_graph_checkpoint_merges_two_turns() -> None:
    checkpointer = InMemorySaver()
    graph = compile_chat_graph(checkpointer=checkpointer)
    thread_id = "user-1:agent:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
    config = {
        "configurable": {
            "thread_id": thread_id,
            "user_id": "user-1",
            "agent_thread_id": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        },
        "recursion_limit": 5,
    }

    fake = _FakeLLM(
        [
            AIMessage(content="Hello from turn 1"),
            AIMessage(content="Hello from turn 2"),
        ]
    )

    with patch(
        "agents_app.agents.core.chat.graph.chat_llm_for_gateway_model",
        return_value=fake,
    ):
        # Recompile so placeholder + middleware use the patched factory consistently.
        graph = compile_chat_graph(checkpointer=checkpointer)
        await graph.ainvoke({"messages": [HumanMessage(content="hi")]}, config)
        await graph.ainvoke({"messages": [HumanMessage(content="again")]}, config)

    snapshot = await graph.aget_state(config)
    messages = snapshot.values.get("messages") or []
    human = [m for m in messages if isinstance(m, HumanMessage)]
    ai = [m for m in messages if isinstance(m, AIMessage)]
    assert len(human) >= 2
    assert len(ai) >= 2
    assert any("turn 1" in str(m.content) for m in ai)
    assert any("turn 2" in str(m.content) for m in ai)
