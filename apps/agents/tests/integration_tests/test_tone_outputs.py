import os
import pytest

from agent.tone_graph import graph
from tests.helpers.tone_contract import (
    EXPECTED_TONE_OUTPUTS,
    load_tone_core_input_fixture,
)

pytestmark = pytest.mark.anyio


def _is_populated(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, (list, dict, tuple, set)):
        return len(value) > 0
    return True


async def test_tone_outputs_contract_all_set() -> None:
    if os.getenv("OPENAI_API_KEY"):
        os.environ["TONE_AGENT_REQUIRE_LLM"] = "1"
    core_input = load_tone_core_input_fixture()
    res = await graph.ainvoke({"core_input": core_input})

    assert isinstance(res, dict)
    assert "outputs" in res
    assert isinstance(res["outputs"], dict)

    outputs = res["outputs"]

    for key in EXPECTED_TONE_OUTPUTS:
        assert key in outputs, f"Missing output: {key}"
        assert _is_populated(outputs[key]), f"Output not set: {key}"
