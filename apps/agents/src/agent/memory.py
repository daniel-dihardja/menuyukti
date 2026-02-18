from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from agent.llm_runtime import build_run_metadata, execute_llm_step
from agent.runtime_config import get_agent_runtime_config


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
    agent_id = "agent-memory-tracker"
    runtime = get_agent_runtime_config(agent_id)
    run_id = f"mem_{payload.location_id}_{payload.analytics_id or 'na'}_{len(payload.events)}"
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
    llm = execute_llm_step(
        agent_id=agent_id,
        runtime=runtime,
        system_prompt=(
            "You are Menuyukti Memory Tracker. "
            "Return JSON keys: continuity_signal, memory_summary, risk_note."
        ),
        user_prompt=(
            f"Summarize memory context for location_id={payload.location_id}, "
            f"analytics_id={payload.analytics_id}, accepted={accepted}, rejected={rejected}."
        ),
    )
    llm_output = llm.output or {}
    llm_signal = llm_output.get("continuity_signal")
    if llm_signal in {"stable", "caution"}:
        continuity_signal = llm_signal

    return {
        "contract_version": payload.contract_version,
        "agent_id": agent_id,
        "status": "accepted",
        "reason_code": "ALLOWED",
        "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
        "memory_context": {
            "location_id": payload.location_id,
            "analytics_id": payload.analytics_id,
            "continuity_signal": continuity_signal,
            "accepted_count": accepted,
            "rejected_count": rejected,
            "recent_events": [event.model_dump() for event in recent],
        },
        "llm": llm.to_public_dict(),
    }
