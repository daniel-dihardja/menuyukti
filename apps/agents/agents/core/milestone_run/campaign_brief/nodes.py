"""Nodes for dedicated campaign-brief generation and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.campaign_brief.prompts import CAMPAIGN_BRIEF_SYSTEM
from agents_app.agents.core.milestone_run.campaign_brief.state import CampaignBriefState
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_location_operating_signals,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_llm_from_milestone_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import (
    CampaignBriefVenueSnapshot,
    validate_skill_output,
)
from agents_app.agents.core.milestone_run.tools.get_location_profile import (
    _fmt_ai_social_settings,
    _fmt_fundamental_signals,
    _fmt_manual_brief_hints,
    _fmt_matrix_signals,
    _fmt_milestone_campaign_brief_owner_notes,
    _fmt_operating_profile,
)
from agents_app.agents.core.milestone_run.tools.write_result_data import _sanitize_venue_name
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import LOCATION_QUERY
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel


class CampaignBriefDraftOutput(BaseModel):
    """LLM-generated campaign brief body before deterministic campaign-window merge."""

    venueSnapshot: CampaignBriefVenueSnapshot
    contentPillars: list[str]
    audienceHypotheses: list[str]
    proofOrientedAngles: list[str]
    toneGuardrails: list[str]
    campaignObjective: str
    targetSegments: list[str]
    messageHierarchy: list[str]
    offerAndCtaPlan: list[str]
    contentPillarPlan: list[str]
    measurementPlan: list[str]
    testingPlan: list[str]
    riskGuardrails: list[str]


_CAMPAIGN_BRIEF_LIST_FIELDS: tuple[str, ...] = (
    "contentPillars",
    "audienceHypotheses",
    "proofOrientedAngles",
    "toneGuardrails",
    "targetSegments",
    "messageHierarchy",
    "offerAndCtaPlan",
    "contentPillarPlan",
    "measurementPlan",
    "testingPlan",
    "riskGuardrails",
)

_UNCATEGORIZED_MAIN_CATEGORY = "(uncategorized)"


def _extract_top_revenue_category(signals_raw: dict[str, Any] | None) -> str:
    """Top POS menu category from category-mix analytics (deterministic, not LLM)."""
    if not isinstance(signals_raw, dict):
        return _UNCATEGORIZED_MAIN_CATEGORY
    instagram = signals_raw.get("instagram_signals")
    if not isinstance(instagram, dict):
        return _UNCATEGORIZED_MAIN_CATEGORY
    fundamental = instagram.get("fundamentalSignals")
    if not isinstance(fundamental, dict):
        return _UNCATEGORIZED_MAIN_CATEGORY
    category_focus = fundamental.get("categoryFocus")
    if not isinstance(category_focus, dict):
        return _UNCATEGORIZED_MAIN_CATEGORY
    category = str(category_focus.get("category") or "").strip()
    return category if category else _UNCATEGORIZED_MAIN_CATEGORY


_CAMPAIGN_BRIEF_FALLBACK_ITEMS: dict[str, tuple[str, str, str]] = {
    "contentPillars": (
        "Signature dishes and hero items",
        "Social proof and guest moments",
        "Operational moments by key dayparts",
    ),
    "audienceHypotheses": (
        "Weekday lunch demand from nearby workers",
        "Weekend demand from social and family occasions",
        "Evening demand from dine-in intent",
    ),
    "proofOrientedAngles": (
        "Use top-selling menu items as proof points",
        "Ground claims in category and demand patterns",
        "Connect proof to a clear action CTA",
    ),
    "toneGuardrails": (
        "Keep claims specific and data-grounded",
        "Use concise and operational language",
        "Avoid exaggerated or unverified statements",
    ),
    "targetSegments": (
        "Weekday lunch nearby workers",
        "Weekend family and social groups",
        "Evening dine-in seekers",
    ),
    "messageHierarchy": (
        "Lead with the hero promise for the venue",
        "Support with concrete proof from menu signals",
        "Close with one clear CTA path",
    ),
    "offerAndCtaPlan": (
        "Keep offers margin-safe and time-bounded",
        "Use reservation or order link as primary CTA",
        "Use DM as fallback for high-intent questions",
    ),
    "contentPillarPlan": (
        "Map each pillar to one business objective",
        "Pair each pillar with a preferred format",
        "Attach one CTA role per pillar",
    ),
    "measurementPlan": (
        "Track saves, shares, and profile visits weekly",
        "Track reservations or orders monthly",
        "If weekly leading signals stay below threshold for 2 weeks, revise creative and CTA",
    ),
    "testingPlan": (
        "Test two dayparts before changing cadence",
        "Test two weekday windows for posting",
        "If tests underperform for 2 weeks, replace hook and format mix",
    ),
    "riskGuardrails": (
        "Respect local promotion and allergen rules",
        "Avoid prohibited topics and visuals",
        "Protect margin by avoiding discount-first messaging",
    ),
}


def _normalize_campaign_list(payload: dict[str, Any], key: str) -> None:
    raw = payload.get(key)
    source = raw if isinstance(raw, list) else []
    deduped: list[str] = []
    seen: set[str] = set()
    for item in source:
        text = str(item).strip()
        if not text:
            continue
        folded = text.casefold()
        if folded in seen:
            continue
        seen.add(folded)
        deduped.append(text)
    if len(deduped) < 3:
        for fallback in _CAMPAIGN_BRIEF_FALLBACK_ITEMS[key]:
            folded = fallback.casefold()
            if folded in seen:
                continue
            deduped.append(fallback)
            seen.add(folded)
            if len(deduped) >= 3:
                break
    payload[key] = deduped[:5]


def _trace(state: CampaignBriefState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: CampaignBriefState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _build_signal_markdown(
    *,
    location_data: dict[str, Any],
    location_raw: dict[str, Any],
    signals: dict[str, Any],
    milestone_input: dict[str, Any] | None,
) -> str:
    currency = str(location_raw.get("currency") or "")
    sections: list[str] = ["## Location profile"]
    identity_lines: list[str] = []
    for label, key in (
        ("Name", "name"),
        ("City", "city"),
        ("Country", "country"),
        ("Currency", "currency"),
    ):
        raw = location_raw.get(key)
        text = str(raw).strip() if raw is not None else ""
        if text:
            identity_lines.append(f"- **{label}**: {text}")
    sections.append("\n".join(identity_lines) if identity_lines else "_No profile fields set._")
    manual_md = _fmt_manual_brief_hints(location_raw)
    if manual_md:
        sections.append(manual_md)

    run = signals.get("analytics_run")
    instagram = signals.get("instagram_signals")
    if run is None:
        sections.append("_No analytics run found for this location - operating signals unavailable._")
        ai_md = _fmt_ai_social_settings(location_data)
        if ai_md:
            sections.append(ai_md)
        if milestone_input:
            notes_md = _fmt_milestone_campaign_brief_owner_notes({"milestone_input": milestone_input})
            if notes_md:
                sections.append(notes_md)
        return "\n\n".join(sections)

    capabilities = instagram.get("capabilities") if isinstance(instagram, dict) else None
    if isinstance(capabilities, dict):
        enabled = capabilities.get("enabledBlocks") or []
        enabled_text = (
            ", ".join(str(x) for x in enabled)
            if isinstance(enabled, list) and enabled
            else "fundamental_signals"
        )
        sections.append("## Signal capabilities")
        sections.append(
            "\n".join(
                [
                    f"- **Has order-level data**: {'yes' if capabilities.get('hasOrderId') else 'no'}",
                    f"- **Has datetime data**: {'yes' if capabilities.get('hasDatetime') else 'no'}",
                    f"- **Enabled blocks**: {enabled_text}",
                ]
            )
        )

    if isinstance(instagram, dict):
        sections.append("## Fundamental signals")
        sections.append(_fmt_fundamental_signals(instagram, currency))

    if isinstance(instagram, dict):
        dt = instagram.get("additionalSignals", {}).get("datetimeSignals")
        if isinstance(dt, dict):
            op = dt.get("bestPostingWindow")
            sections.append("## Operating profile")
            sections.append(_fmt_operating_profile(op if isinstance(op, dict) else {}, currency))

    matrix_md = _fmt_matrix_signals(instagram if isinstance(instagram, dict) else {})
    if matrix_md:
        sections.append("## Additional matrix signals")
        sections.append(matrix_md)

    if isinstance(instagram, dict):
        additional = instagram.get("additionalSignals")
        if isinstance(additional, dict):
            planning = additional.get("campaignPlanningSignals")
            if isinstance(planning, dict):
                planning_lines: list[str] = []
                objective = str(planning.get("objectiveRecommendation") or "").strip()
                cta = str(planning.get("primaryCtaChannel") or "").strip()
                posting_days = planning.get("recommendedPostingDays")
                dayparts = planning.get("recommendedDayparts")
                if objective:
                    planning_lines.append(f"- **Recommended objective**: {objective}")
                if cta:
                    planning_lines.append(f"- **Primary CTA channel**: {cta}")
                if isinstance(posting_days, list) and posting_days:
                    planning_lines.append(
                        f"- **Recommended posting days**: {', '.join(str(x) for x in posting_days)}"
                    )
                if isinstance(dayparts, list) and dayparts:
                    planning_lines.append(
                        f"- **Recommended dayparts**: {', '.join(str(x) for x in dayparts)}"
                    )
                if planning_lines:
                    sections.append("## Campaign planning signals")
                    sections.append("\n".join(planning_lines))

            confidence = additional.get("signalConfidence")
            if isinstance(confidence, dict):
                confidence_lines: list[str] = []
                tier = str(confidence.get("tier") or "").strip()
                notes = confidence.get("coverageNotes")
                if tier:
                    confidence_lines.append(f"- **Signal confidence**: {tier}")
                if isinstance(notes, list) and notes:
                    confidence_lines.extend(f"- {str(note)}" for note in notes if str(note).strip())
                if confidence_lines:
                    sections.append("## Data coverage notes")
                    sections.append("\n".join(confidence_lines))

    ai_md = _fmt_ai_social_settings(location_data)
    if ai_md:
        sections.append(ai_md)

    if milestone_input:
        notes_md = _fmt_milestone_campaign_brief_owner_notes({"milestone_input": milestone_input})
        if notes_md:
            sections.append(notes_md)

    return "\n\n".join(sections)


async def fetch_and_prepare(state: CampaignBriefState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Fetch location + signals and normalize them into deterministic markdown context."""
    _trace(state, "execute_skill", skill_id="campaign_brief")
    location_data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(state["location_id"]), "locationId": int(state["location_id"])},
        str(state["user_id"]),
    )
    raw_loc = location_data.get("location")
    location_raw = raw_loc if isinstance(raw_loc, dict) else {}
    signals = await fetch_location_operating_signals(
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
    )
    signal_markdown = _build_signal_markdown(
        location_data=location_data,
        location_raw=location_raw,
        signals=signals,
        milestone_input=state.get("milestone_input"),
    )
    return {
        "location_raw": location_raw,
        "signals_raw": signals,
        "signal_markdown": signal_markdown,
    }


async def generate_draft(state: CampaignBriefState) -> dict[str, Any]:
    """Generate strictly structured campaign-brief JSON from deterministic signal context."""
    _trace_agent_event(state, "chat_model_start")
    # Generate only creative brief fields here; campaign window + holidays are merged deterministically later.
    llm = structured_llm_from_milestone_run_config().with_structured_output(CampaignBriefDraftOutput)
    generated = await llm.ainvoke(
        [
            SystemMessage(content=CAMPAIGN_BRIEF_SYSTEM),
            HumanMessage(content=str(state.get("signal_markdown", ""))),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": generated.model_dump(exclude_none=True)}


async def persist_result(state: CampaignBriefState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate/coerce and persist with milestone_run's existing write path helper."""
    payload = state.get("generated_output") or {}
    location_raw = state.get("location_raw")
    location_fallback = location_raw if isinstance(location_raw, dict) else {}
    if isinstance(payload, dict):
        venue_snapshot = payload.get("venueSnapshot")
        if not isinstance(venue_snapshot, dict):
            venue_snapshot = {}
            payload["venueSnapshot"] = venue_snapshot
        venue_snapshot.setdefault("venueName", str(location_fallback.get("name") or "").strip())
        venue_snapshot.setdefault("city", str(location_fallback.get("city") or "").strip())
        venue_snapshot.setdefault("country", str(location_fallback.get("country") or "").strip())
        venue_snapshot.setdefault("currency", str(location_fallback.get("currency") or "").strip())
        payload.setdefault("contentPillars", [])
        payload.setdefault("audienceHypotheses", [])
        payload.setdefault("proofOrientedAngles", [])
        payload.setdefault("toneGuardrails", [])
        payload.setdefault("campaignObjective", "")
        payload.setdefault("targetSegments", [])
        payload.setdefault("messageHierarchy", [])
        payload.setdefault("offerAndCtaPlan", [])
        payload.setdefault("contentPillarPlan", [])
        payload.setdefault("measurementPlan", [])
        payload.setdefault("testingPlan", [])
        payload.setdefault("riskGuardrails", [])
        objective = str(payload.get("campaignObjective") or "").strip()
        if not objective:
            payload["campaignObjective"] = (
                "Increase reservations with a conversion-focused campaign objective."
            )
        signals_raw = state.get("signals_raw")
        payload["mainCategory"] = _extract_top_revenue_category(
            signals_raw if isinstance(signals_raw, dict) else None
        )
        for list_key in _CAMPAIGN_BRIEF_LIST_FIELDS:
            _normalize_campaign_list(payload, list_key)

    if isinstance(payload, dict) and isinstance(payload.get("venueSnapshot"), dict):
        venue_snapshot = payload["venueSnapshot"]
        old_name = str(venue_snapshot.get("venueName", ""))
        new_name = _sanitize_venue_name(old_name)
        if new_name and new_name != old_name:
            venue_snapshot["venueName"] = new_name
    normalized, error = validate_skill_output("campaign_brief", payload)
    if error is not None or normalized is None:
        raise ValueError(error or "campaign_brief output validation failed")

    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        normalized,
        str(state["user_id"]),
        client=client,
    )
    result_data = json.dumps(normalized, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": normalized,
        "milestonedata_written": True,
        "raw_data": result_data,
    }
