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


def test_runtime_config_applies_env_overrides(monkeypatch) -> None:
    monkeypatch.setenv("AGENTS_MODEL_ID_MARKETER_STRATEGIST", "gpt-4.1-mini")
    monkeypatch.setenv("AGENTS_PROMPT_VERSION_MARKETER_STRATEGIST", "v1-alt")
    config = get_agent_runtime_config("marketer-strategist")
    assert config.model_id == "gpt-4.1-mini"
    assert config.prompt_version == "v1-alt"
