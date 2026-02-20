from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from menuyukti.agents.learning_eligibility import (
    evaluate_learning_events,
)


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
    # Convert Pydantic events to dicts for menuyukti learning eligibility logic
    event_dicts = [e.model_dump() for e in payload.events]

    # Use deterministic eligibility evaluation from menuyukti
    eligibility_results = evaluate_learning_events(
        events=event_dicts,
        min_sample_size=payload.min_sample_size,
        min_abs_delta_revenue=payload.min_abs_delta_revenue,
    )

    return {
        "contract_version": payload.contract_version,
        "status": "accepted",
        "eligibility": eligibility_results,
    }
