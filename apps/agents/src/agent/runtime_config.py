from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AgentRuntimeConfig:
    agent_id: str
    model_id: str
    prompt_version: str
    timeout_seconds: float
    max_retries: int


AGENT_RUNTIME_CONFIGS: dict[str, AgentRuntimeConfig] = {
    "marketer-strategist": AgentRuntimeConfig(
        agent_id="marketer-strategist",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=8.0,
        max_retries=1,
    ),
    "menu-profit-intelligence": AgentRuntimeConfig(
        agent_id="menu-profit-intelligence",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=8.0,
        max_retries=1,
    ),
    "multi-agent-consensus": AgentRuntimeConfig(
        agent_id="multi-agent-consensus",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=8.0,
        max_retries=1,
    ),
    "what-if-simulation": AgentRuntimeConfig(
        agent_id="what-if-simulation",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=8.0,
        max_retries=1,
    ),
    "agent-memory-tracker": AgentRuntimeConfig(
        agent_id="agent-memory-tracker",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=6.0,
        max_retries=1,
    ),
    "feedback-reranker": AgentRuntimeConfig(
        agent_id="feedback-reranker",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=6.0,
        max_retries=1,
    ),
    "learning-release-loop": AgentRuntimeConfig(
        agent_id="learning-release-loop",
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=6.0,
        max_retries=1,
    ),
}


def get_agent_runtime_config(agent_id: str) -> AgentRuntimeConfig:
    config = AGENT_RUNTIME_CONFIGS.get(agent_id)
    if config:
        return config
    return AgentRuntimeConfig(
        agent_id=agent_id,
        model_id="gpt-4o-mini",
        prompt_version="v1-draft",
        timeout_seconds=8.0,
        max_retries=1,
    )
