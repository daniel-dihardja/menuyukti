from __future__ import annotations

from uuid import uuid4
from typing import Literal

from pydantic import BaseModel, Field

from agent.llm_runtime import (
    build_run_metadata,
    build_skipped_llm_result,
    execute_llm_step,
    resolve_agent_status,
)
from agent.prompt_contracts import get_prompt_contract
from agent.runtime_config import get_agent_runtime_config


Confidence = Literal["high", "medium", "low"]
Readiness = Literal["ready", "degraded", "blocked"]
OfferType = Literal["combo_offer", "happy_hour", "hero_item"]
Daypart = Literal["morning", "lunch", "afternoon", "evening"]


class StrategistSuggestion(BaseModel):
    rank: int = Field(ge=1)
    menu_item: str
    suggested_for: str
    suggested_daypart: Daypart
    offer_type: OfferType
    rationale: str
    confidence: Confidence


class StrategistWeeklyPlanRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    analytics_id: int = Field(gt=0)
    location_id: int = Field(gt=0)
    week_start_date: str
    readiness: Readiness = "ready"
    suggestions: list[StrategistSuggestion] = Field(default_factory=list)


def generate_weekly_plan(payload: StrategistWeeklyPlanRequest) -> dict:
    agent_id = "marketer-strategist"
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
            "plan": {
                "headline": "Weekly plan blocked by data readiness policy.",
                "priorities": [],
            },
            "scheduler_handoff": {
                "recommendations": [],
            },
            "llm": llm.to_public_dict(),
        }

    priorities = [
        {
            "rank": item.rank,
            "menu_item": item.menu_item,
            "suggested_for": item.suggested_for,
            "suggested_daypart": item.suggested_daypart,
            "offer_type": item.offer_type,
            "rationale": item.rationale,
            "confidence": item.confidence,
        }
        for item in payload.suggestions[:7]
    ]

    status = "accepted" if len(priorities) > 0 else "degraded"
    reason_code = "ALLOWED" if len(priorities) > 0 else "NO_ACTIONABLE_SUGGESTIONS"
    if payload.readiness == "degraded":
        status = "degraded"
        reason_code = "DATA_READINESS_DEGRADED"
    headline = (
        "Weekly Instagram growth plan generated."
        if len(priorities) > 0
        else "No actionable suggestions were found for this week."
    )
    prompt_contract = get_prompt_contract(agent_id, runtime.prompt_version)
    llm = execute_llm_step(
        agent_id=agent_id,
        runtime=runtime,
        system_prompt=prompt_contract.system_prompt,
        user_prompt=(
            f"Generate concise strategist summary for analytics_id={payload.analytics_id}, "
            f"location_id={payload.location_id}, priorities_count={len(priorities)}."
        ),
        required_output_keys=prompt_contract.required_output_keys,
    )
    llm_output = llm.output or {}
    llm_headline = llm_output.get("headline")
    if isinstance(llm_headline, str) and llm_headline.strip():
        headline = llm_headline.strip()

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
        "plan": {
            "headline": headline,
            "priorities": priorities,
        },
        "scheduler_handoff": {
            "recommendations": [
                {
                    "menu_item": item["menu_item"],
                    "daypart": item["suggested_daypart"],
                    "offer_type": item["offer_type"],
                    "confidence": item["confidence"],
                    "rationale": item["rationale"],
                }
                for item in priorities
            ],
        },
        "llm": llm.to_public_dict(),
    }
