from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import AGENT_RUNTIME_CONFIGS


def test_prompt_contracts_exist_for_phase1_runtime_configs() -> None:
    for agent_id, runtime in AGENT_RUNTIME_CONFIGS.items():
        contract = get_prompt_contract(agent_id, runtime.prompt_version)
        assert contract.agent_id == agent_id
        assert contract.prompt_version == runtime.prompt_version
        assert isinstance(contract.system_prompt, str) and contract.system_prompt != ""
        assert isinstance(contract.required_output_keys, tuple)


def test_prompt_contract_fallback_keeps_requested_version() -> None:
    contract = get_prompt_contract("unknown-agent", "v999")
    assert contract.agent_id == "unknown-agent"
    assert contract.prompt_version == "v999"
