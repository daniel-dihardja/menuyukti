from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from agent.llm_runtime import (
    build_run_metadata,
    build_skipped_llm_result,
    execute_llm_step,
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


def _strategy_score(candidate: ConsensusCandidate, mode: Mode) -> float:
    growth = max(0.0, candidate.expected_revenue_delta) * (1.15 if mode == "aggressive" else 0.95)
    margin = max(0.0, candidate.expected_margin_delta) * (0.9 if mode == "aggressive" else 1.1)
    confidence = 1.0 if candidate.confidence == "high" else 0.7 if candidate.confidence == "medium" else 0.45
    return growth + margin + confidence


def _risk_penalty(candidate: ConsensusCandidate, mode: Mode) -> float:
    base = len(candidate.risk_flags) * (0.35 if mode == "aggressive" else 0.6)
    low_confidence = 0.8 if candidate.confidence == "low" else 0.0
    blocked = 10.0 if candidate.confidence == "blocked" else 0.0
    return base + low_confidence + blocked


def run_consensus(payload: DebateConsensusRequest) -> dict:
    agent_id = "multi-agent-consensus"
    runtime = get_agent_runtime_config(agent_id)
    run_id = f"run_{uuid4().hex[:16]}"

    if payload.readiness == "blocked":
        llm = build_skipped_llm_result(runtime=runtime, reason_code="DATA_READINESS_BLOCKED")
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

    debate_rows = []
    for item in payload.candidates:
        strategy = _strategy_score(item, payload.mode)
        risk = _risk_penalty(item, payload.mode)
        final = strategy - risk
        debate_rows.append(
            {
                "candidate": item,
                "strategy_score": round(strategy, 4),
                "risk_penalty": round(risk, 4),
                "consensus_score": round(final, 4),
            }
        )

    ranked = sorted(debate_rows, key=lambda row: row["consensus_score"], reverse=True)
    recommendations = [
        {
            "rank": idx + 1,
            "menu_item": row["candidate"].menu_item,
            "action": row["candidate"].action,
            "confidence": row["candidate"].confidence,
            "expected_revenue_delta": round(max(0.0, row["candidate"].expected_revenue_delta), 2),
            "expected_margin_delta": round(max(0.0, row["candidate"].expected_margin_delta), 2),
            "consensus_score": row["consensus_score"],
            "strategy_score": row["strategy_score"],
            "risk_penalty": row["risk_penalty"],
            "risk_flags": row["candidate"].risk_flags,
        }
        for idx, row in enumerate(ranked[:8])
    ]

    winner = recommendations[0] if recommendations else None
    disagreement_reasons: list[str] = []
    for rec in recommendations:
        if rec["risk_flags"]:
            disagreement_reasons.append(f"risk:{rec['menu_item']}")
        if rec["confidence"] in {"low", "blocked"}:
            disagreement_reasons.append(f"confidence:{rec['menu_item']}")
    if not disagreement_reasons and winner:
        disagreement_reasons.append("strategy_and_risk_aligned")

    status = "accepted" if winner else "degraded"
    reason_code = "ALLOWED" if winner else "NO_CONSENSUS_CANDIDATES"
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

    return {
        "contract_version": payload.contract_version,
        "agent_id": agent_id,
        "status": status,
        "reason_code": reason_code,
        "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
        "consensus": {
            "mode": payload.mode,
            "winner": winner,
            "recommendations": recommendations,
            "disagreement_reasons": disagreement_reasons,
        },
        "llm": llm.to_public_dict(),
    }
