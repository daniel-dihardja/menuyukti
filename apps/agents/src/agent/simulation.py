from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from menuyukti.orchestration.simulation import (
    rank_scenarios,
    get_winning_scenario,
)

from agent.llm_runtime import (
    build_run_metadata,
    build_skipped_llm_result,
    execute_llm_step,
    resolve_agent_status,
)
from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import get_agent_runtime_config


Readiness = Literal["ready", "degraded", "blocked"]
ConfidenceBand = Literal["narrow", "medium", "wide"]


class SimulationBaseline(BaseModel):
    weekly_posts: int = Field(gt=0, le=30)
    avg_margin_pct: float = Field(ge=0, le=1)
    avg_revenue_per_post: float = Field(ge=0)


class SimulationScenario(BaseModel):
    scenario_id: str
    name: str
    cadence_multiplier: float = Field(gt=0, le=3)
    item_focus_multiplier: float = Field(gt=0, le=3)
    bundle_multiplier: float = Field(ge=0, le=2)
    constraint_penalty: float = Field(ge=0, le=1)
    assumptions: list[str] = Field(default_factory=list)


class WhatIfSimulationRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    analytics_id: int = Field(gt=0)
    location_id: int = Field(gt=0)
    readiness: Readiness = "ready"
    baseline: SimulationBaseline
    scenarios: list[SimulationScenario] = Field(default_factory=list)


def run_what_if_simulation(payload: WhatIfSimulationRequest) -> dict:
    agent_id = "what-if-simulation"
    runtime = get_agent_runtime_config(agent_id)
    run_id = f"run_{uuid4().hex[:16]}"

    if payload.readiness == "blocked":
        llm = build_skipped_llm_result(
            runtime=runtime, reason_code="DATA_READINESS_BLOCKED"
        )
        return {
            "contract_version": payload.contract_version,
            "agent_id": agent_id,
            "status": "blocked",
            "reason_code": "DATA_READINESS_BLOCKED",
            "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
            "simulation": {
                "winner": None,
                "ranked_scenarios": [],
            },
            "llm": llm.to_public_dict(),
        }

    # Calculate baseline revenue
    baseline_revenue = (
        payload.baseline.avg_revenue_per_post * payload.baseline.weekly_posts
    )

    # Convert Pydantic scenarios to dicts for menuyukti simulation logic
    scenario_dicts = [s.model_dump() for s in payload.scenarios]

    # Use deterministic scenario simulation from menuyukti
    ranked = rank_scenarios(
        scenarios=scenario_dicts,
        baseline_revenue=baseline_revenue,
        baseline_margin_pct=payload.baseline.avg_margin_pct,
        readiness=payload.readiness,
    )

    winner = get_winning_scenario(ranked)
    status = "accepted" if winner else "degraded"
    reason_code = "ALLOWED" if winner else "NO_SCENARIOS_PROVIDED"
    if payload.readiness == "degraded":
        status = "degraded"
        reason_code = "DATA_READINESS_DEGRADED"

    # LLM enhancement (optional, for observability and headlines)
    prompt_contract = get_prompt_contract(agent_id, runtime.prompt_version)
    llm = execute_llm_step(
        agent_id=agent_id,
        runtime=runtime,
        system_prompt=prompt_contract.system_prompt,
        user_prompt=(
            f"Summarize scenario simulation for analytics_id={payload.analytics_id}, "
            f"location_id={payload.location_id}, scenario_count={len(ranked)}."
        ),
        required_output_keys=prompt_contract.required_output_keys,
    )

    final_status, final_reason_code = resolve_agent_status(
        base_status=status,
        base_reason_code=reason_code,
        llm=llm,
    )

    return {
        "contract_version": payload.contract_version,
        "agent_id": agent_id,
        "status": final_status,
        "reason_code": final_reason_code,
        "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
        "simulation": {
            "winner": winner,
            "ranked_scenarios": ranked,
        },
        "llm": llm.to_public_dict(),
    }
