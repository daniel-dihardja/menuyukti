"""
Agent: Release Loop

Manage menu item promotion/demotion through the optimization lifecycle.

Pure function (no frameworks). Used by apps/agents/release_loop.py.
"""

from typing import Literal


Stage = Literal["shadow", "canary", "rollout"]
Decision = Literal["advance", "hold", "rollback"]


def evaluate_release_decision(
    stage: Stage,
    candidate_policy_version: str,
    baseline_policy_version: str,
    shadow_quality_score: float,
    shadow_contract_pass_rate: float,
    canary_error_rate: float,
    canary_regression_rate: float,
    prior_stage_pass: bool = False,
    thresholds: dict[str, float] | None = None,
) -> dict[str, any]:
    """
    Evaluate release decision for a given stage.

    Implements stage-based decision logic:
    - Shadow: Validates quality and contract compliance
    - Canary: Validates error rate and regression metrics
    - Rollout: Requires prior stage success

    Args:
        stage: Release stage (shadow, canary, rollout)
        candidate_policy_version: Candidate policy version
        baseline_policy_version: Baseline policy version
        shadow_quality_score: Quality score from shadow stage (0-1)
        shadow_contract_pass_rate: Contract compliance rate (0-1)
        canary_error_rate: Error rate from canary stage (0-1)
        canary_regression_rate: Regression rate from canary stage (0-1)
        prior_stage_pass: Whether prior stage passed (for rollout)
        thresholds: Custom threshold overrides. Defaults to standard thresholds

    Returns:
        {
            "decision": Decision (advance/hold/rollback),
            "reasons": List of reason codes,
            "rollback_to_policy_version": Policy version to rollback to (if decision=rollback)
        }
    """
    if thresholds is None:
        thresholds = {}

    threshold_defaults = {
        "shadow_quality_min": 0.6,
        "shadow_contract_pass_min": 0.95,
        "canary_error_max": 0.05,
        "canary_regression_max": 0.1,
    }
    thresholds = {**threshold_defaults, **thresholds}

    reasons: list[str] = []
    decision: Decision = "hold"
    rollback_to_policy_version: str | None = None

    # Shadow stage: Check quality and contract compliance
    shadow_ok = (
        shadow_quality_score >= thresholds["shadow_quality_min"]
        and shadow_contract_pass_rate >= thresholds["shadow_contract_pass_min"]
    )
    if not shadow_ok:
        reasons.append("shadow_threshold_failed")

    # Stage-specific logic
    if stage == "shadow":
        decision = "advance" if shadow_ok else "hold"
    elif stage == "canary":
        if not shadow_ok:
            decision = "hold"
        else:
            canary_ok = (
                canary_error_rate <= thresholds["canary_error_max"]
                and canary_regression_rate <= thresholds["canary_regression_max"]
            )
            if canary_ok:
                decision = "advance"
            else:
                decision = "rollback"
                rollback_to_policy_version = baseline_policy_version
                if canary_error_rate > thresholds["canary_error_max"]:
                    reasons.append("canary_error_rate_exceeded")
                if canary_regression_rate > thresholds["canary_regression_max"]:
                    reasons.append("canary_regression_exceeded")
    else:  # rollout
        if not prior_stage_pass:
            decision = "hold"
            reasons.append("prior_stage_not_passed")
        else:
            decision = "advance"

    return {
        "decision": decision,
        "reasons": reasons,
        "rollback_to_policy_version": rollback_to_policy_version,
    }


def get_stage_metrics_summary(
    stage: Stage,
    shadow_quality_score: float,
    shadow_contract_pass_rate: float,
    canary_error_rate: float,
    canary_regression_rate: float,
) -> dict[str, any]:
    """
    Get human-readable summary of stage metrics.

    Args:
        stage: Release stage
        shadow_quality_score: Quality score (0-1)
        shadow_contract_pass_rate: Contract compliance (0-1)
        canary_error_rate: Error rate (0-1)
        canary_regression_rate: Regression rate (0-1)

    Returns:
        Dictionary with formatted metrics summary
    """
    if stage == "shadow":
        return {
            "quality_score": f"{shadow_quality_score:.2%}",
            "contract_pass_rate": f"{shadow_contract_pass_rate:.2%}",
        }
    elif stage == "canary":
        return {
            "error_rate": f"{canary_error_rate:.2%}",
            "regression_rate": f"{canary_regression_rate:.2%}",
        }
    else:  # rollout
        return {
            "stage": "rollout",
            "status": "depends_on_prior_stage_pass",
        }
