from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from agent.llm_runtime import build_run_metadata, execute_llm_step
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
    run_id = f"rerank_{payload.policy_version}_{len(payload.baseline)}_{len(payload.priors)}"
    priors_by_id = {prior.recommendation_id: prior for prior in payload.priors}
    eligible_signals = [prior for prior in payload.priors if prior.sample_size >= 1]
    fallback = len(eligible_signals) < payload.min_signal_count

    scored = []
    for item in payload.baseline:
        prior = priors_by_id.get(item.recommendation_id)
        feedback_boost = 0.0
        if not fallback and prior:
            revenue_factor = max(-0.25, min(0.25, prior.avg_delta_revenue / 1000))
            feedback_boost = (
                (prior.success_rate - 0.5) * 0.6
                + min(0.3, prior.sample_size / 100) * 0.25
                + revenue_factor
            )
        final_score = item.baseline_score if fallback else max(0.0, item.baseline_score + feedback_boost)

        scored.append(
            {
                "recommendation_id": item.recommendation_id,
                "menu_item": item.menu_item,
                "action": item.action,
                "baseline_rank": item.rank,
                "baseline_score": round(item.baseline_score, 4),
                "feedback_boost": round(feedback_boost, 4),
                "final_score": round(final_score, 4),
                "prior": prior.model_dump() if prior else None,
            }
        )

    ranked = sorted(scored, key=lambda row: row["final_score"], reverse=True)
    recommendations = []
    for index, row in enumerate(ranked, start=1):
        recommendations.append(
            {
                **row,
                "final_rank": index,
                "rank_delta": row["baseline_rank"] - index,
                "explainability": {
                    "policy_version": payload.policy_version,
                    "fallback_to_baseline": fallback,
                    "explanation": (
                        "fallback_to_baseline_due_to_weak_signals"
                        if fallback
                        else "score = baseline + feedback_boost"
                    ),
                },
            }
        )
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

    return {
        "contract_version": payload.contract_version,
        "agent_id": agent_id,
        "status": "accepted",
        "reason_code": "ALLOWED",
        "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
        "policy_version": payload.policy_version,
        "fallback_to_baseline": fallback,
        "signal_count": len(eligible_signals),
        "recommendations": recommendations,
        "llm": llm.to_public_dict(),
    }
