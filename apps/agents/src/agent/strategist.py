from __future__ import annotations

from uuid import uuid4
from typing import Literal

from pydantic import BaseModel, Field


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
    run_id = f"run_{uuid4().hex[:16]}"

    if payload.readiness == "blocked":
        return {
            "contract_version": payload.contract_version,
            "agent_id": "marketer-strategist",
            "status": "blocked",
            "reason_code": "DATA_READINESS_BLOCKED",
            "run": {
                "run_id": run_id,
                "model": "marketer-strategist-v1",
            },
            "plan": {
                "headline": "Weekly plan blocked by data readiness policy.",
                "priorities": [],
            },
            "scheduler_handoff": {
                "recommendations": [],
            },
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
    headline = (
        "Weekly Instagram growth plan generated."
        if len(priorities) > 0
        else "No actionable suggestions were found for this week."
    )

    return {
        "contract_version": payload.contract_version,
        "agent_id": "marketer-strategist",
        "status": status,
        "reason_code": reason_code,
        "run": {
            "run_id": run_id,
            "model": "marketer-strategist-v1",
        },
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
    }
