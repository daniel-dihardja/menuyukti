import pytest
from dataclasses import asdict

from agent import graph
from agent.graph import State
from agent.ig_campaign import planning_subgraph

pytestmark = pytest.mark.anyio


@pytest.mark.langsmith
async def test_agent_simple_passthrough() -> None:
    inputs = {"changeme": "some_val"}
    res = await graph.ainvoke(inputs)
    assert res is not None


async def test_run_planning_agent_returns_markdown_mentioning_planning() -> None:
    """Planning subgraph output is markdown that mentions 'planning'."""
    state = State(message="Generate Instagram posts for my cafe")
    result = await planning_subgraph.ainvoke(asdict(state))
    assert "response" in result
    assert "planning" in result["response"].lower()
    assert state.message in result["response"]
