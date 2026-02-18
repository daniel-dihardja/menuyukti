from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


Readiness = Literal["ready", "degraded", "blocked"]
BoardAction = Literal["promote", "improve", "bundle", "deprioritize"]
Confidence = Literal["high", "medium", "low"]


class ProfitCandidate(BaseModel):
    menu_item: str
    matrix_action: Literal["promote", "reprice", "remove", "keep", "none"] = "none"
    margin_pct: float = 0
    units_sold: int = 0
    revenue: float = 0
    impact_score: float = 0
    combo_supported: bool = False
    attribution_delta_revenue: float = 0


class ComboSignal(BaseModel):
    menu_item_a_name: str
    menu_item_b_name: str
    combo_opportunity_score: float = 0


class ProfitIntelligenceRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    analytics_id: int = Field(gt=0)
    location_id: int = Field(gt=0)
    readiness: Readiness = "ready"
    cogs_readiness: Readiness = "ready"
    candidates: list[ProfitCandidate] = Field(default_factory=list)
    combo_signals: list[ComboSignal] = Field(default_factory=list)


def _decide_action(candidate: ProfitCandidate) -> BoardAction:
    if candidate.combo_supported:
        return "bundle"
    if candidate.matrix_action == "promote":
        return "promote"
    if candidate.matrix_action == "reprice":
        return "improve"
    if candidate.matrix_action == "remove":
        return "deprioritize"
    if candidate.attribution_delta_revenue < 0:
        return "improve"
    return "promote"


def _confidence(candidate: ProfitCandidate) -> Confidence:
    if candidate.impact_score >= 0.75 and candidate.margin_pct >= 0.25:
        return "high"
    if candidate.impact_score >= 0.35:
        return "medium"
    return "low"


def generate_action_board(payload: ProfitIntelligenceRequest) -> dict:
    run_id = f"run_{uuid4().hex[:16]}"

    if payload.readiness == "blocked":
        return {
            "contract_version": payload.contract_version,
            "agent_id": "menu-profit-intelligence",
            "status": "blocked",
            "reason_code": "DATA_READINESS_BLOCKED",
            "run": {
                "run_id": run_id,
                "model": "menu-profit-intelligence-v1",
            },
            "board": {
                "headline": "Action board blocked by readiness policy.",
                "recommendations": [],
            },
        }

    ranked = sorted(payload.candidates, key=lambda item: item.impact_score, reverse=True)[:10]
    recommendations = []
    for idx, item in enumerate(ranked, start=1):
        action = _decide_action(item)
        confidence = _confidence(item)
        revenue_lift = round(max(0.0, item.revenue * (0.04 if action in {"promote", "bundle"} else 0.02)), 2)
        margin_lift = round(max(0.0, revenue_lift * max(0.1, item.margin_pct)), 2)
        recommendations.append(
            {
                "rank": idx,
                "recommendation_id": f"rec:{item.menu_item.strip().lower().replace(' ', '_')}",
                "menu_item": item.menu_item,
                "action": action,
                "confidence": confidence,
                "impact": {
                    "expected_revenue_delta": revenue_lift,
                    "expected_margin_delta": margin_lift,
                },
                "evidence": [
                    {
                        "kind": "matrix",
                        "matrix_action": item.matrix_action,
                        "margin_pct": item.margin_pct,
                        "units_sold": item.units_sold,
                    },
                    {
                        "kind": "cogs",
                        "readiness": payload.cogs_readiness,
                    },
                    {
                        "kind": "attribution",
                        "delta_revenue": item.attribution_delta_revenue,
                    },
                    {
                        "kind": "combos",
                        "supported": item.combo_supported,
                    },
                ],
            }
        )

    status = "accepted" if len(recommendations) > 0 else "degraded"
    reason_code = "ALLOWED" if len(recommendations) > 0 else "NO_ACTIONABLE_RECOMMENDATIONS"
    headline = (
        "Analyst action board generated with profitability priorities."
        if len(recommendations) > 0
        else "No actionable profitability recommendations were generated."
    )

    return {
        "contract_version": payload.contract_version,
        "agent_id": "menu-profit-intelligence",
        "status": status,
        "reason_code": reason_code,
        "run": {
            "run_id": run_id,
            "model": "menu-profit-intelligence-v1",
        },
        "board": {
            "headline": headline,
            "recommendations": recommendations,
        },
    }
