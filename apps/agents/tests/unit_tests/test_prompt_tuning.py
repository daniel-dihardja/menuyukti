from __future__ import annotations

from agent.prompt_tuning import get_phase1_agents, get_prompt_versions_for_agent, run_prompt_tuning_loop


def test_prompt_versions_include_tuned_variant_for_phase1_agents() -> None:
    agents = get_phase1_agents()
    assert len(agents) >= 7
    for agent in agents:
        versions = get_prompt_versions_for_agent(agent)
        assert "v1-tuned" in versions


def test_prompt_tuning_loop_returns_approved_versions_for_target_agents() -> None:
    report = run_prompt_tuning_loop(mode="mock", agents=["marketer-strategist", "what-if-simulation"])
    approved = report["approved_prompt_versions"]
    assert "marketer-strategist" in approved
    assert "what-if-simulation" in approved
