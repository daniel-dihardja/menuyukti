from __future__ import annotations

from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


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


def _confidence_band(penalty: float, readiness: Readiness) -> ConfidenceBand:
    if readiness == "blocked":
        return "wide"
    if penalty >= 0.3:
        return "wide"
    if penalty >= 0.12 or readiness == "degraded":
        return "medium"
    return "narrow"


def _confidence_range(value: float, band: ConfidenceBand) -> tuple[float, float]:
    spread = 0.08 if band == "narrow" else 0.16 if band == "medium" else 0.3
    low = max(0.0, value * (1 - spread))
    high = max(0.0, value * (1 + spread))
    return (round(low, 2), round(high, 2))


def run_what_if_simulation(payload: WhatIfSimulationRequest) -> dict:
    run_id = f"run_{uuid4().hex[:16]}"

    if payload.readiness == "blocked":
        return {
            "contract_version": payload.contract_version,
            "agent_id": "what-if-simulation",
            "status": "blocked",
            "reason_code": "DATA_READINESS_BLOCKED",
            "run": {"run_id": run_id, "model": "what-if-simulation-v1"},
            "simulation": {
                "winner": None,
                "ranked_scenarios": [],
            },
        }

    ranked = []
    baseline_revenue = (
        payload.baseline.avg_revenue_per_post * payload.baseline.weekly_posts
    )

    for scenario in payload.scenarios:
        gross_revenue = (
            payload.baseline.avg_revenue_per_post
            * payload.baseline.weekly_posts
            * scenario.cadence_multiplier
            * scenario.item_focus_multiplier
            * (1 + (scenario.bundle_multiplier * 0.08))
        )
        projected_revenue = gross_revenue * (1 - scenario.constraint_penalty)
        projected_margin = (
            projected_revenue
            * payload.baseline.avg_margin_pct
            * (1 + scenario.bundle_multiplier * 0.05)
            * (1 - scenario.constraint_penalty * 0.5)
        )
        expected_uplift = projected_revenue - baseline_revenue
        confidence_band = _confidence_band(scenario.constraint_penalty, payload.readiness)
        revenue_low, revenue_high = _confidence_range(
            projected_revenue, confidence_band
        )
        margin_low, margin_high = _confidence_range(projected_margin, confidence_band)

        score = (
            (projected_margin * 0.55)
            + (max(0.0, expected_uplift) * 0.35)
            - (scenario.constraint_penalty * 100)
        )

        ranked.append(
            {
                "scenario_id": scenario.scenario_id,
                "name": scenario.name,
                "assumptions": scenario.assumptions,
                "metrics": {
                    "projected_revenue": round(projected_revenue, 2),
                    "projected_margin": round(projected_margin, 2),
                    "expected_uplift": round(expected_uplift, 2),
                },
                "confidence": {
                    "band": confidence_band,
                    "revenue_low": revenue_low,
                    "revenue_high": revenue_high,
                    "margin_low": margin_low,
                    "margin_high": margin_high,
                },
                "rationale": (
                    f"{scenario.name} balances cadence({scenario.cadence_multiplier}) "
                    f"and focus({scenario.item_focus_multiplier}) with constraint penalty "
                    f"{scenario.constraint_penalty}."
                ),
                "simulation_score": round(score, 3),
            }
        )

    ranked.sort(key=lambda row: row["simulation_score"], reverse=True)
    winner = ranked[0] if ranked else None
    status = "accepted" if winner else "degraded"
    reason_code = "ALLOWED" if winner else "NO_SCENARIOS_PROVIDED"

    return {
        "contract_version": payload.contract_version,
        "agent_id": "what-if-simulation",
        "status": status,
        "reason_code": reason_code,
        "run": {"run_id": run_id, "model": "what-if-simulation-v1"},
        "simulation": {
            "winner": winner,
            "ranked_scenarios": ranked,
        },
    }
