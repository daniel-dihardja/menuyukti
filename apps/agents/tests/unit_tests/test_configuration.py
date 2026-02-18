from agent.tool_contract import POLICY_MATRIX


def test_runtime_policy_matrix_is_defined() -> None:
    assert ("marketer", "planning") in POLICY_MATRIX
    assert ("analyst", "analysis") in POLICY_MATRIX
