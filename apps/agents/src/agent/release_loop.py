from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from agent.llm_runtime import build_run_metadata, execute_llm_step, resolve_agent_status
from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import get_agent_runtime_config
from menuyukti.agents.release_loop import (
    evaluate_release_decision as _evaluate_release_decision,
)


Stage = Literal["shadow", "canary", "rollout"]
Decision = Literal["advance", "hold", "rollback"]


class ReleaseLoopMetrics(BaseModel):
    shadow_quality_score: float = Field(ge=0, le=1)
    shadow_contract_pass_rate: float = Field(ge=0, le=1)
    canary_error_rate: float = Field(ge=0, le=1)
    canary_regression_rate: float = Field(ge=0, le=1)


class ReleaseLoopRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    stage: Stage
    candidate_policy_version: str
    baseline_policy_version: str
    prior_stage_pass: bool = False
    metrics: ReleaseLoopMetrics
    thresholds: dict[str, float] = Field(default_factory=dict)


def evaluate_release_loop(payload: ReleaseLoopRequest) -> dict:
    agent_id = "learning-release-loop"
    runtime = get_agent_runtime_config(agent_id)
    run_id = f"run_{uuid4().hex[:16]}"

    # Deterministic release decision logic
    release_decision = _evaluate_release_decision(
        stage=payload.stage,
        candidate_policy_version=payload.candidate_policy_version,
        baseline_policy_version=payload.baseline_policy_version,
        shadow_quality_score=payload.metrics.shadow_quality_score,
        shadow_contract_pass_rate=payload.metrics.shadow_contract_pass_rate,
        canary_error_rate=payload.metrics.canary_error_rate,
        canary_regression_rate=payload.metrics.canary_regression_rate,
        prior_stage_pass=payload.prior_stage_pass,
        thresholds=payload.thresholds,
    )

    decision: Decision = release_decision["decision"]
    reasons: list[str] = release_decision["reasons"]
    rollback_to_policy_version: str | None = release_decision[
        "rollback_to_policy_version"
    ]

    prompt_contract = get_prompt_contract(agent_id, runtime.prompt_version)
    llm = execute_llm_step(
        agent_id=agent_id,
        runtime=runtime,
        system_prompt=prompt_contract.system_prompt,
        user_prompt=(
            f"Summarize release decision for stage={payload.stage}, "
            f"candidate={payload.candidate_policy_version}, decision={decision}, reasons={','.join(reasons)}."
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
        "release_decision": {
            "stage": payload.stage,
            "candidate_policy_version": payload.candidate_policy_version,
            "baseline_policy_version": payload.baseline_policy_version,
            "decision": decision,
            "reasons": reasons,
            "rollback_to_policy_version": rollback_to_policy_version,
        },
        "thresholds": payload.thresholds,
        "llm": llm.to_public_dict(),
    }
