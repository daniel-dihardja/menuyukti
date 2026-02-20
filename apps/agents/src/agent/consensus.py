from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from menuyukti.agents.consensus import (
    rank_consensus_candidates,
    get_consensus_winner,
    get_disagreement_reasons,
)

from agent.llm_runtime import (
    build_run_metadata,
    build_skipped_llm_result,
    execute_llm_step,
    resolve_agent_status,
)
from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import get_agent_runtime_config


Mode = Literal["conservative", "aggressive"]
Readiness = Literal["ready", "degraded", "blocked"]
Action = Literal["promote", "improve", "bundle", "deprioritize"]
Confidence = Literal["high", "medium", "low", "blocked"]


class ConsensusCandidate(BaseModel):
    rank: int = Field(ge=1)
    menu_item: str
    action: Action
    confidence: Confidence = "medium"
    expected_revenue_delta: float = 0
    expected_margin_delta: float = 0
    risk_flags: list[str] = Field(default_factory=list)


class DebateConsensusRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    analytics_id: int = Field(gt=0)
    location_id: int = Field(gt=0)
    readiness: Readiness = "ready"
    mode: Mode = "conservative"
    candidates: list[ConsensusCandidate] = Field(default_factory=list)


def run_consensus(payload: DebateConsensusRequest) -> dict:
    agent_id = "multi-agent-consensus"
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
            "consensus": {
                "mode": payload.mode,
                "winner": None,
                "recommendations": [],
                "disagreement_reasons": ["data_readiness_blocked"],
            },
            "llm": llm.to_public_dict(),
        }

    # Convert Pydantic candidates to dicts for menuyukti consensus logic
    candidate_dicts = [c.model_dump() for c in payload.candidates]

    # Use deterministic consensus ranking from menuyukti
    recommendations = rank_consensus_candidates(
        candidates=candidate_dicts,
        mode=payload.mode,
        top_k=8,
    )

    winner = get_consensus_winner(recommendations)
    disagreement_reasons = get_disagreement_reasons(recommendations)

    status = "accepted" if winner else "degraded"
    reason_code = "ALLOWED" if winner else "NO_CONSENSUS_CANDIDATES"
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
            f"Summarize consensus result for analytics_id={payload.analytics_id}, "
            f"mode={payload.mode}, recommendation_count={len(recommendations)}."
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
        "consensus": {
            "mode": payload.mode,
            "winner": winner,
            "recommendations": recommendations,
            "disagreement_reasons": disagreement_reasons,
        },
        "llm": llm.to_public_dict(),
    }
