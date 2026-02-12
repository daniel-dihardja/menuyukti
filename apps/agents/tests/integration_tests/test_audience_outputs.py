import pytest

from agent import graph
from tests.helpers.audience_contract import (
    EXPECTED_AUDIENCE_OUTPUTS,
    load_audience_core_input_fixture,
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


async def test_audience_outputs_contract_all_set() -> None:
    core_input = load_audience_core_input_fixture()
    res = await graph.ainvoke({"core_input": core_input})

    assert isinstance(res, dict)
    assert "outputs" in res
    assert isinstance(res["outputs"], dict)

    outputs = res["outputs"]

    for key in EXPECTED_AUDIENCE_OUTPUTS:
        assert key in outputs, f"Missing output: {key}"
        assert _is_populated(outputs[key]), f"Output not set: {key}"
