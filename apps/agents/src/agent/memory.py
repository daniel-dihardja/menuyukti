from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from agent.llm_runtime import build_run_metadata, execute_llm_step, resolve_agent_status
from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import get_agent_runtime_config
from menuyukti.orchestration.memory_context import get_memory_analytics


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

    # Deterministic memory analytics
    events_dict = [event.model_dump() for event in payload.events]
    analytics = get_memory_analytics(events_dict, max_items=payload.max_items)

    accepted = analytics["accepted_count"]
    rejected = analytics["rejected_count"]
    continuity_signal = analytics["continuity_signal"]
    recent = analytics["recent_events"]

    prompt_contract = get_prompt_contract(agent_id, runtime.prompt_version)
    llm = execute_llm_step(
        agent_id=agent_id,
        runtime=runtime,
        system_prompt=prompt_contract.system_prompt,
        user_prompt=(
            f"Summarize memory context for location_id={payload.location_id}, "
            f"analytics_id={payload.analytics_id}, accepted={accepted}, rejected={rejected}."
        ),
        required_output_keys=prompt_contract.required_output_keys,
    )
    llm_output = llm.output or {}
    llm_signal = llm_output.get("continuity_signal")
    if llm_signal in {"stable", "caution"}:
        continuity_signal = llm_signal

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
        "memory_context": {
            "location_id": payload.location_id,
            "analytics_id": payload.analytics_id,
            "continuity_signal": continuity_signal,
            "accepted_count": accepted,
            "rejected_count": rejected,
            "recent_events": recent,
        },
        "llm": llm.to_public_dict(),
    }
