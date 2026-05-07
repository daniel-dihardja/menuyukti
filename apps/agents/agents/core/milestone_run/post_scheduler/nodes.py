"""Nodes for dedicated post-scheduler concept generation and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_campaign_schedule_plan,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.output_schema import (
    validate_skill_output,
)
from agents_app.agents.core.milestone_run.post_scheduler.prompts import POST_SCHEDULER_SYSTEM
from agents_app.agents.core.milestone_run.post_scheduler.state import (
    PostSchedulerOutput,
    PostSchedulerState,
)
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

_JSON_SEPARATORS = (",", ":")


def _trace(state: PostSchedulerState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: PostSchedulerState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _json_block(title: str, payload: Any) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    return f"## {title}\n```json\n{encoded}\n```"


def _fmt_milestone_post_scheduler_owner_notes(state: PostSchedulerState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "post_scheduler":
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    text = notes.strip()
    if not text:
        return ""
    return (
        "## Milestone scheduler input (owner)\n\n"
        "_User-supplied notes from the milestone Input tab - use as scheduling guidance "
        "for cadence and timing, but keep menu items grounded in prefetched promotion candidates._\n\n"
        f"{text}"
    )


def _build_generation_context(
    *,
    state: PostSchedulerState,
    scheduler_plan: dict[str, Any] | None,
    owner_notes_markdown: str,
) -> str:
    sections: list[str] = []
    sections.append(f"## Milestone goal\n{str(state.get('goal') or '').strip() or '_No goal provided._'}")
    sections.append(_json_block("Milestone criteria", state.get("criteria") or []))
    if scheduler_plan is not None:
        sections.append(_json_block("Scheduler plan signals", scheduler_plan))
    else:
        sections.append("## Scheduler plan signals\n_Scheduler plan unavailable from GraphQL._")
    if isinstance(state.get("milestone_input"), dict):
        sections.append(_json_block("Milestone input", state.get("milestone_input")))
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if injected:
        sections.append(injected)
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


def _fallback_output() -> PostSchedulerOutput:
    return {
        "monthlyArc": {
            "weeks": [
                {
                    "week": 1,
                    "objective": "Build awareness with low-friction signature dish discovery.",
                    "rationale": "Start the month with high-reach creative that introduces the core offer.",
                },
                {
                    "week": 2,
                    "objective": "Strengthen consideration through proof and education.",
                    "rationale": "Use educational and social-proof content to increase saves and intent.",
                },
                {
                    "week": 3,
                    "objective": "Drive conversion with clear visit and order intent.",
                    "rationale": "Shift toward direct response with tactical CTAs and timely urgency.",
                },
                {
                    "week": 4,
                    "objective": "Reinforce loyalty and community momentum.",
                    "rationale": "Close the month by retaining guests and celebrating community participation.",
                },
            ]
        },
        "contentRatio": {
            "pillars": [
                {
                    "pillar": "Signature dishes",
                    "percent": 40,
                    "reason": "Keep appetite-led hero content as the main growth lever.",
                },
                {
                    "pillar": "Social proof",
                    "percent": 30,
                    "reason": "Customer proof supports consideration and confidence.",
                },
                {
                    "pillar": "Community",
                    "percent": 30,
                    "reason": "Sustain loyalty and repeat visit momentum.",
                },
            ]
        },
        "formatMix": {
            "formats": [
                {"format": "Reels", "count": 8, "reason": "Discovery and reach."},
                {"format": "Carousels", "count": 4, "reason": "Education and saves."},
                {"format": "Single posts", "count": 4, "reason": "Promotion touchpoints."},
                {"format": "Stories", "count": 30, "reason": "Daily engagement cadence."},
                {"format": "Highlights updates", "count": 2, "reason": "Profile utility refresh."},
                {"format": "Lives", "count": 1, "reason": "Real-time trust building."},
                {"format": "Collaborator posts", "count": 2, "reason": "Partner reach expansion."},
            ]
        },
        "weeklySlotPlan": [
            {
                "week": 1,
                "day": "Monday",
                "format": "Carousel",
                "pillar": "Signature dishes",
                "hook": "Open with a hero dish close-up that signals value in the first frame.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": "Awareness",
                "visualDirection": "Natural-light dish sequence from prep to plated result.",
                "notes": "Save-oriented educational carousel for week 1.",
            },
            {
                "week": 2,
                "day": "Tuesday",
                "format": "Carousel",
                "pillar": "Social proof",
                "hook": "Start with a guest testimonial card and proof metric.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": "Consideration",
                "visualDirection": "UGC snapshots and review overlays.",
                "notes": "Keep copy concise and proof-led.",
            },
            {
                "week": 3,
                "day": "Wednesday",
                "format": "Single post",
                "pillar": "Signature dishes",
                "hook": "Lead with a limited-time value proposition.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Order",
                "funnelStage": "Conversion",
                "visualDirection": "Counter pickup shot and plated close-up.",
                "notes": "Single-post promotion slot.",
            },
            {
                "week": 4,
                "day": "Thursday",
                "format": "Carousel",
                "pillar": "Community",
                "hook": "Open with team/community moment to signal belonging.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": "Loyalty",
                "visualDirection": "Staff + guest interaction moments in natural light.",
                "notes": "Loyalty/community closeout slot.",
            },
        ],
        "guardrailCheck": "Plan generated in fallback mode; verify guardrails before publishing.",
    }


def _rebalance_content_ratio(payload: dict[str, Any]) -> dict[str, Any]:
    content_ratio = payload.get("contentRatio")
    if not isinstance(content_ratio, dict):
        return payload
    pillars = content_ratio.get("pillars")
    if not isinstance(pillars, list) or not pillars:
        return payload

    normalized: list[dict[str, Any]] = []
    for item in pillars:
        if not isinstance(item, dict):
            continue
        percent_raw = item.get("percent", 0)
        try:
            percent = int(percent_raw)
        except (TypeError, ValueError):
            percent = 0
        normalized.append(
            {
                **item,
                "percent": max(0, percent),
            }
        )
    if not normalized:
        return payload

    total = sum(int(item.get("percent", 0)) for item in normalized)
    if total == 100:
        payload["contentRatio"] = {"pillars": normalized}
        return payload

    if total <= 0:
        split = 100 // len(normalized)
        remainder = 100 - (split * len(normalized))
        for index, item in enumerate(normalized):
            item["percent"] = split + (1 if index < remainder else 0)
    else:
        scaled = [round((int(item["percent"]) / total) * 100) for item in normalized]
        diff = 100 - sum(scaled)
        if diff != 0:
            # Apply remainder to the largest bucket for deterministic correction.
            largest_idx = max(range(len(scaled)), key=lambda idx: scaled[idx])
            scaled[largest_idx] += diff
        for index, item in enumerate(normalized):
            item["percent"] = max(0, int(scaled[index]))

    payload["contentRatio"] = {"pillars": normalized}
    return payload


def _ensure_weekly_save_optimized_slot(payload: dict[str, Any]) -> dict[str, Any]:
    slots = payload.get("weeklySlotPlan")
    if not isinstance(slots, list):
        return payload

    def _is_save_optimized(slot: dict[str, Any]) -> bool:
        slot_format = str(slot.get("format") or "").strip()
        cta_type = str(slot.get("ctaType") or "").strip()
        return slot_format == "Carousel" or cta_type == "Save"

    week_to_indexes: dict[int, list[int]] = {1: [], 2: [], 3: [], 4: []}
    for index, raw_slot in enumerate(slots):
        if not isinstance(raw_slot, dict):
            continue
        week_raw = raw_slot.get("week")
        try:
            week = int(week_raw)
        except (TypeError, ValueError):
            continue
        if week in week_to_indexes:
            week_to_indexes[week].append(index)

    for week in (1, 2, 3, 4):
        indexes = week_to_indexes[week]
        if any(_is_save_optimized(slots[idx]) for idx in indexes if isinstance(slots[idx], dict)):
            continue

        if indexes:
            # Re-purpose the first slot in that week to become save-optimized.
            idx = indexes[0]
            slot = slots[idx]
            if isinstance(slot, dict):
                slot["format"] = "Carousel"
                slot["ctaType"] = "Save"
                slot["captionStructure"] = (
                    str(slot.get("captionStructure") or "").strip()
                    or "Hook -> Context -> Proof -> CTA summary"
                )
                slot["notes"] = (
                    (str(slot.get("notes") or "").strip() + " ").strip()
                    + "Adjusted to satisfy weekly save-optimized guardrail."
                ).strip()
                slots[idx] = slot
            continue

        # No slot exists for this week; inject minimal valid save-optimized slot.
        slots.append(
            {
                "week": week,
                "day": "Monday",
                "format": "Carousel",
                "pillar": "Education",
                "hook": "Open with a clear practical takeaway in frame one.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": (
                    "Awareness"
                    if week == 1
                    else "Consideration" if week == 2 else "Conversion" if week == 3 else "Loyalty"
                ),
                "visualDirection": "Smartphone close-up sequence in natural light.",
                "notes": "Injected to satisfy weekly save-optimized guardrail.",
            }
        )

    payload["weeklySlotPlan"] = slots
    return payload


async def fetch_and_prepare(
    state: PostSchedulerState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Fetch scheduler-plan context and normalize generation markdown."""
    _trace(state, "execute_skill", skill_id="post_scheduler")
    scheduler_plan: dict[str, Any] | None = None
    workflow_id = state.get("workflow_id")
    milestone_id = str(state.get("milestone_id") or "").strip()
    if isinstance(workflow_id, str) and workflow_id.strip() and milestone_id:
        try:
            scheduler_plan = await fetch_campaign_schedule_plan(
                workflow_id.strip(),
                milestone_id,
                int(state["location_id"]),
                str(state["user_id"]),
                client=client,
            )
        except Exception as exc:
            _trace(
                state,
                "execute_skill",
                skill_id="post_scheduler",
                scheduler_plan_error=str(exc),
            )
            scheduler_plan = None
    owner_notes_markdown = _fmt_milestone_post_scheduler_owner_notes(state)
    generation_context_markdown = _build_generation_context(
        state=state,
        scheduler_plan=scheduler_plan,
        owner_notes_markdown=owner_notes_markdown,
    )
    return {
        "scheduler_plan": scheduler_plan,
        "owner_notes_markdown": owner_notes_markdown,
        "generation_context_markdown": generation_context_markdown,
    }


class MonthlyArcWeekDraft(BaseModel):
    week: int
    objective: str
    rationale: str


class MonthlyArcDraft(BaseModel):
    weeks: list[MonthlyArcWeekDraft] = Field(default_factory=list)


class ContentRatioItemDraft(BaseModel):
    pillar: str
    percent: int
    reason: str


class ContentRatioDraft(BaseModel):
    pillars: list[ContentRatioItemDraft] = Field(default_factory=list)


class FormatMixItemDraft(BaseModel):
    format: str
    count: int
    reason: str


class FormatMixDraft(BaseModel):
    formats: list[FormatMixItemDraft] = Field(default_factory=list)


class WeeklySlotDraft(BaseModel):
    week: int
    day: str
    format: str
    pillar: str
    hook: str
    caption_structure: str = Field(alias="captionStructure")
    cta_type: str = Field(alias="ctaType")
    funnel_stage: str = Field(alias="funnelStage")
    visual_direction: str = Field(alias="visualDirection")
    notes: str


class PostSchedulerDraftOutput(BaseModel):
    monthly_arc: MonthlyArcDraft = Field(alias="monthlyArc")
    content_ratio: ContentRatioDraft = Field(alias="contentRatio")
    format_mix: FormatMixDraft = Field(alias="formatMix")
    weekly_slot_plan: list[WeeklySlotDraft] = Field(alias="weeklySlotPlan", default_factory=list)
    guardrail_check: str = Field(alias="guardrailCheck")


def _normalize_generated_output(payload: Any) -> PostSchedulerOutput:
    base = _fallback_output()
    if not isinstance(payload, dict):
        return base
    payload = _rebalance_content_ratio(payload)
    payload = _ensure_weekly_save_optimized_slot(payload)
    normalized, error = validate_skill_output("post_scheduler", payload)
    if error is not None or not isinstance(normalized, dict):
        return base
    return normalized


async def generate_campaign_concepts(state: PostSchedulerState) -> dict[str, Any]:
    """Generate structured monthly scheduler strategy from brief context."""
    llm = get_llm_structured().with_structured_output(PostSchedulerDraftOutput)
    _trace_agent_event(state, "chat_model_start")
    generated = await llm.ainvoke(
        [
            SystemMessage(content=POST_SCHEDULER_SYSTEM),
            HumanMessage(content=str(state.get("generation_context_markdown") or "").strip()),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    normalized = _normalize_generated_output(
        generated.model_dump(by_alias=True, exclude_none=True)
    )
    return {"generated_output": normalized}


async def persist_result(state: PostSchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate/coerce and persist post-scheduler payload via milestone data upsert."""
    payload = _normalize_generated_output(state.get("generated_output"))
    normalized, error = validate_skill_output("post_scheduler", payload)
    if error is not None or normalized is None:
        raise ValueError(error or "post_scheduler output validation failed")
    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        normalized,
        str(state["user_id"]),
        client=client,
    )
    result_data = json.dumps(normalized, ensure_ascii=False, indent=2, separators=_JSON_SEPARATORS)
    return {
        "result_data": result_data,
        "milestone_data": normalized,
        "milestonedata_written": True,
        "raw_data": result_data,
    }
