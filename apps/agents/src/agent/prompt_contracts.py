from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PromptContract:
    agent_id: str
    prompt_version: str
    system_prompt: str
    required_output_keys: tuple[str, ...]


PROMPT_CONTRACTS: dict[tuple[str, str], PromptContract] = {
    (
        "marketer-strategist",
        "v1-draft",
    ): PromptContract(
        agent_id="marketer-strategist",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti Instagram Growth Strategist. "
            "Return strict JSON only."
        ),
        required_output_keys=("headline", "confidence_note", "brief_rationale"),
    ),
    (
        "menu-profit-intelligence",
        "v1-draft",
    ): PromptContract(
        agent_id="menu-profit-intelligence",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti Menu Profit Intelligence agent. "
            "Return strict JSON only."
        ),
        required_output_keys=("headline", "confidence_note", "analyst_summary"),
    ),
    (
        "multi-agent-consensus",
        "v1-draft",
    ): PromptContract(
        agent_id="multi-agent-consensus",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti Multi-Agent Consensus arbiter. "
            "Return strict JSON only."
        ),
        required_output_keys=("headline", "consensus_confidence", "reason_summary"),
    ),
    (
        "what-if-simulation",
        "v1-draft",
    ): PromptContract(
        agent_id="what-if-simulation",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti What-If Simulation agent. "
            "Return strict JSON only."
        ),
        required_output_keys=("headline", "scenario_summary", "confidence_note"),
    ),
    (
        "agent-memory-tracker",
        "v1-draft",
    ): PromptContract(
        agent_id="agent-memory-tracker",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti Agent Memory Tracker. "
            "Return strict JSON only."
        ),
        required_output_keys=("continuity_signal", "memory_summary", "risk_note"),
    ),
    (
        "feedback-reranker",
        "v1-draft",
    ): PromptContract(
        agent_id="feedback-reranker",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti Feedback Reranker. "
            "Return strict JSON only."
        ),
        required_output_keys=("ranking_summary", "confidence_note"),
    ),
    (
        "learning-release-loop",
        "v1-draft",
    ): PromptContract(
        agent_id="learning-release-loop",
        prompt_version="v1-draft",
        system_prompt=(
            "You are Menuyukti Learning Release Loop controller. "
            "Return strict JSON only."
        ),
        required_output_keys=("release_summary", "risk_note", "recommendation"),
    ),
}


def get_prompt_contract(agent_id: str, prompt_version: str) -> PromptContract:
    direct = PROMPT_CONTRACTS.get((agent_id, prompt_version))
    if direct is not None:
        return direct

    # Graceful fallback to latest known prompt contract for this agent.
    candidates = [item for key, item in PROMPT_CONTRACTS.items() if key[0] == agent_id]
    if candidates:
        return candidates[0]

    return PromptContract(
        agent_id=agent_id,
        prompt_version=prompt_version,
        system_prompt="Return strict JSON only.",
        required_output_keys=(),
    )
