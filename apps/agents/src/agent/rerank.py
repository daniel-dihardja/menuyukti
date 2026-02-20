from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from menuyukti.orchestration.rerank import (
    rerank_by_feedback,
)

from agent.llm_runtime import build_run_metadata, execute_llm_step, resolve_agent_status
from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import get_agent_runtime_config


class BaselineRecommendation(BaseModel):
    recommendation_id: str
    rank: int = Field(ge=1)
    menu_item: str
    action: Literal["promote", "improve", "bundle", "deprioritize"]
    baseline_score: float = Field(ge=0)


class FeedbackPrior(BaseModel):
    recommendation_id: str
    sample_size: int = Field(ge=0)
    success_rate: float = Field(ge=0, le=1)
    avg_delta_revenue: float = 0


class RerankRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    policy_version: str = "as10-v1"
    min_signal_count: int = Field(default=3, ge=1, le=10_000)
    baseline: list[BaselineRecommendation] = Field(default_factory=list)
    priors: list[FeedbackPrior] = Field(default_factory=list)


def rerank_recommendations(payload: RerankRequest) -> dict:
    agent_id = "feedback-reranker"
    runtime = get_agent_runtime_config(agent_id)
    run_id = (
        f"rerank_{payload.policy_version}_{len(payload.baseline)}_{len(payload.priors)}"
    )

    # Convert Pydantic models to dicts for menuyukti reranking logic
    baseline_dicts = [b.model_dump() for b in payload.baseline]
    priors_dicts = [p.model_dump() for p in payload.priors]

    # Use deterministic feedback-based reranking from menuyukti
    recommendations = rerank_by_feedback(
        baseline=baseline_dicts,
        priors=priors_dicts,
        min_signal_count=payload.min_signal_count,
    )

    # Check if we fell back to baseline
    fallback = (
        recommendations[0]["explainability"]["fallback_to_baseline"]
        if recommendations
        else False
    )
    eligible_signals = [p for p in payload.priors if p.sample_size >= 1]

    # LLM enhancement (optional, for observability and headlines)
    prompt_contract = get_prompt_contract(agent_id, runtime.prompt_version)
    llm = execute_llm_step(
        agent_id=agent_id,
        runtime=runtime,
        system_prompt=prompt_contract.system_prompt,
        user_prompt=(
            f"Summarize reranking for policy_version={payload.policy_version}, "
            f"baseline_count={len(payload.baseline)}, signal_count={len(eligible_signals)}, fallback={fallback}."
        ),
        required_output_keys=prompt_contract.required_output_keys,
    )

    status, reason_code = resolve_agent_status(
        base_status="accepted",
        base_reason_code="ALLOWED",
        llm=llm,
    )

    return {
        "contract_version": payload.contract_version,
        "agent_id": agent_id,
        "status": status,
        "reason_code": reason_code,
        "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
        "policy_version": payload.policy_version,
        "fallback_to_baseline": fallback,
        "signal_count": len(eligible_signals),
        "recommendations": recommendations,
        "llm": llm.to_public_dict(),
    }
