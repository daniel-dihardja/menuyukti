from __future__ import annotations

from uuid import uuid4
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from agent.llm_runtime import build_run_metadata, build_skipped_llm_result
from agent.runtime_config import get_agent_runtime_config


Tone = Literal["premium", "friendly", "playful"]
Objective = Literal["traffic", "margin", "awareness"]
Daypart = Literal["morning", "lunch", "afternoon", "evening"]
PriceBand = Literal["budget", "mid", "premium"]
InventoryPressure = Literal["low", "medium", "high"]


class PromptTuningTestAgentRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    scenario_id: str = Field(min_length=1)
    restaurant_name: str = Field(min_length=1)
    menu_item: str = Field(min_length=1)
    target_audience: str = Field(min_length=1)
    tone: Tone
    objective: Objective
    daypart: Daypart
    price_band: PriceBand
    inventory_pressure: InventoryPressure
    brand_guardrails: list[str] = Field(default_factory=list)
    forbidden_phrases: list[str] = Field(default_factory=list)
    must_include_terms: list[str] = Field(default_factory=list)
    candidate_actions: list[str] = Field(min_length=2)
    evidence_facts: list[str] = Field(min_length=1)
    prompt_text: str | None = None

    @field_validator("candidate_actions")
    @classmethod
    def validate_candidate_actions(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip() for item in value if item.strip()]
        if len(cleaned) < 2:
            raise ValueError("candidate_actions must include at least 2 non-empty values")
        return cleaned


def _clean_text(text: str, forbidden_phrases: list[str]) -> str:
    cleaned = text
    for phrase in forbidden_phrases:
        stripped = phrase.strip()
        if stripped:
            cleaned = cleaned.replace(stripped, "")
    return " ".join(cleaned.split())


def run_prompt_tuning_test_agent(payload: PromptTuningTestAgentRequest) -> dict:
    agent_id = "prompt-tuning-test-agent"
    runtime = get_agent_runtime_config("marketer-strategist")
    run_id = f"run_{uuid4().hex[:16]}"
    llm = build_skipped_llm_result(runtime=runtime, reason_code="PILOT_TEST_AGENT_LOCAL_RUNTIME")

    primary_action = payload.candidate_actions[0]
    fallback_action = payload.candidate_actions[1]

    headline = f"{payload.menu_item} {payload.daypart.title()} Offer for {payload.target_audience}"
    audience_hook = f"{payload.target_audience.title()} value {payload.price_band} picks."
    fact = payload.evidence_facts[0]
    justification = f"Prioritize {primary_action} because {fact.lower()}."
    risk_note = (
        "High inventory pressure; monitor offer fatigue."
        if payload.inventory_pressure == "high"
        else "Monitor campaign response and adjust cadence weekly."
    )
    hashtags = [f"#{payload.daypart}Special", "#MenuyuktiPilot", "#PromoTest"]

    if payload.must_include_terms:
        extra = payload.must_include_terms[0].strip()
        if extra:
            headline = f"{headline} {extra}"

    headline = _clean_text(headline, payload.forbidden_phrases)
    audience_hook = _clean_text(audience_hook, payload.forbidden_phrases)
    justification = _clean_text(justification, payload.forbidden_phrases)
    risk_note = _clean_text(risk_note, payload.forbidden_phrases)

    if len(hashtags) > 4:
        hashtags = hashtags[:4]

    return {
        "contract_version": payload.contract_version,
        "agent_id": agent_id,
        "status": "accepted",
        "reason_code": "ALLOWED",
        "run": build_run_metadata(run_id=run_id, runtime=runtime, llm=llm),
        "task": "campaign-offer-brief-generator",
        "scenario_id": payload.scenario_id,
        "headline": headline,
        "primary_action": primary_action,
        "fallback_action": fallback_action,
        "audience_hook": audience_hook,
        "justification": justification,
        "risk_note": risk_note,
        "hashtags": hashtags,
        "llm": llm.to_public_dict(),
    }
