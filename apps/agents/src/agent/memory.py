from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


RecommendationState = Literal["accepted", "rejected"]


class MemoryEvent(BaseModel):
    id: str
    version: int = Field(ge=1)
    recommendation_id: str
    source_agent_id: str
    state: RecommendationState
    rationale: str | None = None
    execution_link: str | None = None
    created_at: str


class MemoryContextRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    location_id: int = Field(gt=0)
    analytics_id: int | None = Field(default=None, gt=0)
    max_items: int = Field(default=10, ge=1, le=100)
    events: list[MemoryEvent] = Field(default_factory=list)


def build_memory_context(payload: MemoryContextRequest) -> dict:
    sorted_events = sorted(
        payload.events,
        key=lambda event: (event.version, event.created_at),
        reverse=True,
    )
    recent = sorted_events[: payload.max_items]
    accepted = sum(1 for event in recent if event.state == "accepted")
    rejected = sum(1 for event in recent if event.state == "rejected")

    continuity_signal = (
        "stable"
        if accepted >= rejected
        else "caution"
    )

    return {
        "contract_version": payload.contract_version,
        "status": "accepted",
        "memory_context": {
            "location_id": payload.location_id,
            "analytics_id": payload.analytics_id,
            "continuity_signal": continuity_signal,
            "accepted_count": accepted,
            "rejected_count": rejected,
            "recent_events": [event.model_dump() for event in recent],
        },
    }
