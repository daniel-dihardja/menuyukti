from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


SignalType = Literal[
    "recommendation_issued",
    "user_decision",
    "execution_status",
    "outcome_delta",
]


class LearningEvent(BaseModel):
    linkage_key: str
    signal_type: SignalType
    outcome_delta_revenue: float | None = None
    outcome_delta_qty: float | None = None
    outcome_confidence: Literal["high", "medium", "low", "blocked"] | None = None
    sample_size: int | None = Field(default=None, ge=0)


class LearningEligibilityRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    min_sample_size: int = Field(default=7, ge=1, le=10_000)
    min_abs_delta_revenue: float = Field(default=25, ge=0, le=1_000_000)
    events: list[LearningEvent] = Field(default_factory=list)


def evaluate_learning_eligibility(payload: LearningEligibilityRequest) -> dict:
    result: list[dict] = []

    for event in payload.events:
        reasons: list[str] = []
        eligible = True

        if event.signal_type != "outcome_delta":
            eligible = False
            reasons.append("signal_not_outcome")
        else:
            if event.outcome_confidence in {None, "low", "blocked"}:
                eligible = False
                reasons.append("outcome_confidence_too_low")

            sample_size = event.sample_size or 0
            if sample_size < payload.min_sample_size:
                eligible = False
                reasons.append("sample_size_below_minimum")

            abs_delta = abs(event.outcome_delta_revenue or 0)
            if abs_delta < payload.min_abs_delta_revenue:
                eligible = False
                reasons.append("outcome_delta_too_small")

        result.append(
            {
                "linkage_key": event.linkage_key,
                "signal_type": event.signal_type,
                "eligible": eligible,
                "reasons": reasons,
            }
        )

    return {
        "contract_version": payload.contract_version,
        "status": "accepted",
        "eligibility": result,
    }
