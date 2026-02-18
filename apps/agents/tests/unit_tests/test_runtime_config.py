from agent.runtime_config import AGENT_RUNTIME_CONFIGS, get_agent_runtime_config


def test_phase1_agent_runtime_configs_exist() -> None:
    for agent_id in [
        "marketer-strategist",
        "menu-profit-intelligence",
        "multi-agent-consensus",
        "what-if-simulation",
        "agent-memory-tracker",
        "feedback-reranker",
        "learning-release-loop",
    ]:
        assert agent_id in AGENT_RUNTIME_CONFIGS
        config = get_agent_runtime_config(agent_id)
        assert isinstance(config.model_id, str) and config.model_id != ""
        assert isinstance(config.prompt_version, str) and config.prompt_version != ""
        assert config.timeout_seconds > 0
        assert config.max_retries >= 0
