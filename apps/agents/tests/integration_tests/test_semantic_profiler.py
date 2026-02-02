import pytest

from agent import semantic_profiler as sp

pytestmark = pytest.mark.anyio


async def test_agent_simple_passthrough() -> None:
    inputs = {"title": "some_val 123"}
    res = await sp.ainvoke(inputs)
    assert res is not None
