from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


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
    run_id = f"run_{uuid4().hex[:16]}"
    thresholds = {
        "shadow_quality_min": payload.thresholds.get("shadow_quality_min", 0.6),
        "shadow_contract_pass_min": payload.thresholds.get("shadow_contract_pass_min", 0.95),
        "canary_error_max": payload.thresholds.get("canary_error_max", 0.05),
        "canary_regression_max": payload.thresholds.get("canary_regression_max", 0.1),
    }

    reasons: list[str] = []
    decision: Decision = "hold"
    rollback_to_policy_version: str | None = None

    shadow_ok = (
        payload.metrics.shadow_quality_score >= thresholds["shadow_quality_min"]
        and payload.metrics.shadow_contract_pass_rate >= thresholds["shadow_contract_pass_min"]
    )
    if not shadow_ok:
        reasons.append("shadow_threshold_failed")

    if payload.stage == "shadow":
        decision = "advance" if shadow_ok else "hold"
    elif payload.stage == "canary":
        if not shadow_ok:
            decision = "hold"
        else:
            canary_ok = (
                payload.metrics.canary_error_rate <= thresholds["canary_error_max"]
                and payload.metrics.canary_regression_rate <= thresholds["canary_regression_max"]
            )
            if canary_ok:
                decision = "advance"
            else:
                decision = "rollback"
                rollback_to_policy_version = payload.baseline_policy_version
                if payload.metrics.canary_error_rate > thresholds["canary_error_max"]:
                    reasons.append("canary_error_rate_exceeded")
                if payload.metrics.canary_regression_rate > thresholds["canary_regression_max"]:
                    reasons.append("canary_regression_exceeded")
    else:  # rollout
        if not payload.prior_stage_pass:
            decision = "hold"
            reasons.append("prior_stage_not_passed")
        else:
            decision = "advance"

    return {
        "contract_version": payload.contract_version,
        "status": "accepted",
        "run": {
            "run_id": run_id,
            "model": "learning-release-loop-v1",
        },
        "release_decision": {
            "stage": payload.stage,
            "candidate_policy_version": payload.candidate_policy_version,
            "baseline_policy_version": payload.baseline_policy_version,
            "decision": decision,
            "reasons": reasons,
            "rollback_to_policy_version": rollback_to_policy_version,
        },
        "thresholds": thresholds,
    }
