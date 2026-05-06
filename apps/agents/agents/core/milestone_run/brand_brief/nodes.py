"""Nodes for dedicated brand-brief generation and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.brand_brief.prompts import BRAND_BRIEF_SYSTEM
from agents_app.agents.core.milestone_run.brand_brief.state import BrandBriefState
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_location_operating_signals,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.output_schema import (
    BrandBriefMilestoneOutput,
    validate_skill_output,
)
from agents_app.agents.core.milestone_run.tools.get_location_profile import (
    _fmt_ai_social_settings,
    _fmt_fundamental_signals,
    _fmt_manual_brief_hints,
    _fmt_matrix_signals,
    _fmt_milestone_brand_brief_owner_notes,
    _fmt_operating_profile,
)
from agents_app.agents.core.milestone_run.tools.write_result_data import _sanitize_venue_name
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import LOCATION_QUERY
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer


def _trace(state: BrandBriefState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: BrandBriefState, kind: str, **extra: Any) -> None:
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
            notes_md = _fmt_milestone_brand_brief_owner_notes({"milestone_input": milestone_input})
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

    ai_md = _fmt_ai_social_settings(location_data)
    if ai_md:
        sections.append(ai_md)

    if milestone_input:
        notes_md = _fmt_milestone_brand_brief_owner_notes({"milestone_input": milestone_input})
        if notes_md:
            sections.append(notes_md)

    return "\n\n".join(sections)


async def fetch_and_prepare(state: BrandBriefState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Fetch location + signals and normalize them into deterministic markdown context."""
    _trace(state, "execute_skill", skill_id="brand_brief")
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


async def generate_draft(state: BrandBriefState) -> dict[str, Any]:
    """Generate strictly structured brand-brief JSON from deterministic signal context."""
    _trace_agent_event(state, "chat_model_start")
    llm = get_llm_structured().with_structured_output(BrandBriefMilestoneOutput)
    generated = await llm.ainvoke(
        [
            SystemMessage(content=BRAND_BRIEF_SYSTEM),
            HumanMessage(content=str(state.get("signal_markdown", ""))),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": generated.model_dump(exclude_none=True)}


async def persist_result(state: BrandBriefState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate/coerce and persist with milestone_run's existing write path helper."""
    payload = state.get("generated_output") or {}
    if isinstance(payload, dict) and isinstance(payload.get("venueSnapshot"), dict):
        venue_snapshot = payload["venueSnapshot"]
        old_name = str(venue_snapshot.get("venueName", ""))
        new_name = _sanitize_venue_name(old_name)
        if new_name and new_name != old_name:
            venue_snapshot["venueName"] = new_name

    normalized, error = validate_skill_output("brand_brief", payload)
    if error is not None or normalized is None:
        raise ValueError(error or "brand_brief output validation failed")

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
