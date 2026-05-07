"""Nodes for dedicated post-scheduler concept generation and persistence."""

from __future__ import annotations

from datetime import date, timedelta
import json
import re
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_campaign_schedule_plan,
    fetch_promotion_engineering_candidates,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.output_schema import (
    PostSchedulerDateConceptItem,
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
from pydantic import BaseModel

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
        "## Milestone post scheduler input (owner)\n\n"
        "_User-supplied notes from the milestone Input tab - use as scheduling guidance "
        "for cadence and timing, but keep menu items grounded in prefetched promotion candidates._\n\n"
        f"{text}"
    )


def _build_generation_context(
    *,
    state: PostSchedulerState,
    scheduler_plan: dict[str, Any] | None,
    promotion_candidates: dict[str, Any] | None,
    owner_notes_markdown: str,
) -> str:
    start_date, end_date = _extract_campaign_date_bounds(state)
    date_window_markdown = _build_date_window_markdown(start_date=start_date, end_date=end_date)
    sections: list[str] = []
    sections.append(f"## Milestone goal\n{str(state.get('goal') or '').strip() or '_No goal provided._'}")
    sections.append(_json_block("Milestone criteria", state.get("criteria") or []))
    if scheduler_plan is not None:
        sections.append(_json_block("Scheduler plan signals", scheduler_plan))
    else:
        sections.append("## Scheduler plan signals\n_Scheduler plan unavailable from GraphQL._")
    if promotion_candidates is not None:
        sections.append(_json_block("Promotion candidates", promotion_candidates))
    else:
        sections.append("## Promotion candidates\n_Promotion candidates unavailable from GraphQL._")
    sections.append(date_window_markdown)
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if injected:
        sections.append(injected)
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


def _fallback_output() -> PostSchedulerOutput:
    return {"dateConcepts": [], "daySummary": {"weekdayCount": 0, "weekendCount": 0}}


def _parse_iso_date(raw: Any) -> date | None:
    if not isinstance(raw, str):
        return None
    text = raw.strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _extract_campaign_date_bounds(state: PostSchedulerState) -> tuple[date | None, date | None]:
    scheduler_plan = state.get("scheduler_plan")
    if isinstance(scheduler_plan, dict):
        start = _parse_iso_date(scheduler_plan.get("campaignStart"))
        end = _parse_iso_date(scheduler_plan.get("campaignEnd"))
        if start is not None and end is not None:
            return start, end
    return None, None


def _count_weekday_weekend_days(start_date: date, end_date: date) -> tuple[int, int]:
    if end_date < start_date:
        start_date, end_date = end_date, start_date
    weekday_count = 0
    weekend_count = 0
    cursor = start_date
    while cursor <= end_date:
        if cursor.weekday() >= 5:
            weekend_count += 1
        else:
            weekday_count += 1
        cursor += timedelta(days=1)
    return weekday_count, weekend_count


def _list_campaign_dates(start_date: date, end_date: date) -> list[date]:
    if end_date < start_date:
        start_date, end_date = end_date, start_date
    out: list[date] = []
    cursor = start_date
    while cursor <= end_date:
        out.append(cursor)
        cursor += timedelta(days=1)
    return out


def _build_date_window_markdown(*, start_date: date | None, end_date: date | None) -> str:
    if start_date is None or end_date is None:
        return "## Campaign date window\n_Campaign start/end dates unavailable._"
    dates = _list_campaign_dates(start_date, end_date)
    weekdays = [d.isoformat() for d in dates if d.weekday() < 5]
    weekends = [d.isoformat() for d in dates if d.weekday() >= 5]
    payload = {
        "campaignStart": dates[0].isoformat() if dates else start_date.isoformat(),
        "campaignEnd": dates[-1].isoformat() if dates else end_date.isoformat(),
        "allDatesInclusive": [
            {
                "date": d.isoformat(),
                "dayOfWeek": d.strftime("%A"),
                "dayCategory": "weekend" if d.weekday() >= 5 else "weekday",
            }
            for d in dates
        ],
        "availableDays": {
            "weekdays": weekdays,
            "weekends": weekends,
            "weekdayCount": len(weekdays),
            "weekendCount": len(weekends),
        },
    }
    return _json_block("Campaign date window and available days", payload)


def _extract_allowed_menu_names(state: PostSchedulerState) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    source_counts = {"scheduler_slot": 0, "promotion_category": 0, "promotion_flat": 0}

    def _add(value: Any, source: str) -> None:
        if not isinstance(value, str):
            return
        text = value.strip()
        if not text:
            return
        if not _is_probable_menu_name(text):
            return
        key = text.casefold()
        if key in seen:
            return
        seen.add(key)
        out.append(text)
        if source in source_counts:
            source_counts[source] += 1

    # Prefer concrete scheduler slots when available.
    scheduler_plan = state.get("scheduler_plan")
    if isinstance(scheduler_plan, dict):
        slots = scheduler_plan.get("slots")
        if isinstance(slots, list):
            for row in slots:
                if not isinstance(row, dict):
                    continue
                for item in row.get("promotedMenuItems") or []:
                    _add(item, "scheduler_slot")

    # Ingest prefetched promotion candidates for scheduler-allowed menu items.
    promotion_candidates = state.get("promotion_candidates")
    if isinstance(promotion_candidates, dict):
        grouping = str(promotion_candidates.get("grouping") or "").strip()
        if grouping == "by_menu_category":
            categories = promotion_candidates.get("categories")
            if isinstance(categories, dict):
                for bucket in categories.values():
                    if not isinstance(bucket, dict):
                        continue
                    for item in bucket.get("starItems") or []:
                        _add(item, "promotion_category")
                    for item in bucket.get("puzzleItems") or []:
                        _add(item, "promotion_category")
        else:
            for item in promotion_candidates.get("starItems") or []:
                _add(item, "promotion_flat")
            for item in promotion_candidates.get("puzzleItems") or []:
                _add(item, "promotion_flat")

    return out


def _enforce_allowed_menu_names(
    payload: PostSchedulerOutput, *, allowed_menu_names: list[str]
) -> PostSchedulerOutput:
    concepts = payload.get("dateConcepts") or []
    if not concepts:
        return payload
    if not allowed_menu_names:
        return payload

    allowed_lookup = {name.casefold() for name in allowed_menu_names}
    normalized_concepts: list[dict[str, Any]] = []
    for concept in concepts:
        menu_items = concept.get("promotedMenuItems") or []
        kept: list[str] = []
        seen: set[str] = set()
        for item in menu_items:
            if not isinstance(item, str):
                continue
            text = item.strip()
            if not text:
                continue
            key = text.casefold()
            if key not in allowed_lookup or key in seen:
                continue
            seen.add(key)
            kept.append(text)
        next_concept = dict(concept)
        if kept:
            next_concept["promotedMenuItems"] = kept
        elif "promotedMenuItems" in next_concept:
            next_concept["promotedMenuItems"] = None
        normalized_concepts.append(next_concept)
    out: PostSchedulerOutput = {
        "dateConcepts": normalized_concepts,
        "daySummary": payload["daySummary"],
    }
    if "promotionCandidates" in payload:
        out["promotionCandidates"] = payload.get("promotionCandidates")
    return out


def _normalize_promotion_candidates(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    grouping = str(payload.get("grouping") or "").strip()
    if not grouping:
        return None
    out: dict[str, Any] = {"grouping": grouping}

    categories = payload.get("categories")
    if isinstance(categories, dict):
        normalized_categories: dict[str, dict[str, list[str]]] = {}
        for category_name, raw_bucket in categories.items():
            if not isinstance(raw_bucket, dict):
                continue
            star_items = [str(x).strip() for x in raw_bucket.get("starItems", []) if str(x).strip()]
            puzzle_items = [str(x).strip() for x in raw_bucket.get("puzzleItems", []) if str(x).strip()]
            normalized_categories[str(category_name)] = {
                "starItems": star_items,
                "puzzleItems": puzzle_items,
            }
        out["categories"] = normalized_categories

    star_items = [str(x).strip() for x in payload.get("starItems", []) if str(x).strip()]
    puzzle_items = [str(x).strip() for x in payload.get("puzzleItems", []) if str(x).strip()]
    if star_items:
        out["starItems"] = star_items
    if puzzle_items:
        out["puzzleItems"] = puzzle_items
    return out


def _is_probable_menu_name(text: str) -> bool:
    # Accept compact dish/beverage names; reject sentence-like guidance lines.
    if len(text) > 60:
        return False
    if re.search(r"[.,:;!?]", text):
        return False
    words = text.split()
    if len(words) > 6:
        return False
    return True


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
            # Keep the dedicated graph resilient when scheduler-plan GraphQL is unavailable.
            _trace(
                state,
                "execute_skill",
                skill_id="post_scheduler",
                scheduler_plan_error=str(exc),
            )
            scheduler_plan = None
    promotion_candidates: dict[str, Any] | None = None
    try:
        promotion_candidates = await fetch_promotion_engineering_candidates(
            int(state["location_id"]),
            str(state["user_id"]),
            client=client,
        )
    except Exception as exc:
        _trace(
            state,
            "execute_skill",
            skill_id="post_scheduler",
            promotion_candidates_error=str(exc),
        )
        promotion_candidates = None
    owner_notes_markdown = _fmt_milestone_post_scheduler_owner_notes(state)
    generation_context_markdown = _build_generation_context(
        state=state,
        scheduler_plan=scheduler_plan,
        promotion_candidates=promotion_candidates,
        owner_notes_markdown=owner_notes_markdown,
    )
    return {
        "scheduler_plan": scheduler_plan,
        "promotion_candidates": promotion_candidates,
        "owner_notes_markdown": owner_notes_markdown,
        "generation_context_markdown": generation_context_markdown,
    }


def _build_base_output(state: PostSchedulerState) -> PostSchedulerOutput:
    start_date, end_date = _extract_campaign_date_bounds(state)
    if start_date is None or end_date is None:
        return _fallback_output()
    weekday_count, weekend_count = _count_weekday_weekend_days(start_date, end_date)
    return {
        "dateConcepts": [],
        "daySummary": {
            "weekdayCount": weekday_count,
            "weekendCount": weekend_count,
        },
    }


class PostSchedulerDraftOutput(BaseModel):
    dateConcepts: list[PostSchedulerDateConceptItem]


def _build_default_concepts(state: PostSchedulerState) -> list[dict[str, Any]]:
    start_date, end_date = _extract_campaign_date_bounds(state)
    if start_date is None or end_date is None:
        return []
    concepts: list[dict[str, Any]] = []
    for item in _list_campaign_dates(start_date, end_date):
        day_type = "weekend" if item.weekday() >= 5 else "weekday"
        concepts.append(
            {
                "date": item.isoformat(),
                "dayOfWeek": item.strftime("%A"),
                "format": "Story" if day_type == "weekend" else "Carousel",
                "formatReason": (
                    "Weekend stories create timely activation and direct response."
                    if day_type == "weekend"
                    else "Weekday carousels support saves and proof-led consideration."
                ),
                "conceptInstruction": (
                    "Publish a concept that combines appetite appeal, social proof, and a clear CTA."
                ),
                "relevanceDescription": (
                    "Maintains daily consistency with conversion-oriented restaurant Instagram messaging."
                ),
            }
        )
    return concepts


def _normalize_generated_output(payload: Any, *, state: PostSchedulerState) -> PostSchedulerOutput:
    base = _build_base_output(state)
    if not isinstance(payload, dict):
        return base
    concepts = payload.get("dateConcepts")
    if not isinstance(concepts, list):
        return base
    normalized_concepts: list[dict[str, Any]] = []
    for concept in concepts:
        if not isinstance(concept, dict):
            continue
        menu_items = [str(x).strip() for x in (concept.get("promotedMenuItems") or []) if str(x).strip()]
        normalized_concept = {
            "date": str(concept.get("date") or "").strip(),
            "dayOfWeek": str(concept.get("dayOfWeek") or "").strip(),
            "format": str(concept.get("format") or "").strip(),
            "formatReason": str(concept.get("formatReason") or "").strip(),
            "conceptInstruction": str(concept.get("conceptInstruction") or "").strip(),
            "relevanceDescription": str(concept.get("relevanceDescription") or "").strip(),
        }
        if menu_items:
            normalized_concept["promotedMenuItems"] = menu_items
        normalized_concepts.append(normalized_concept)
    base["dateConcepts"] = normalized_concepts
    return base


def _ensure_full_date_coverage(payload: PostSchedulerOutput, *, state: PostSchedulerState) -> PostSchedulerOutput:
    expected = _build_default_concepts(state)
    if not expected:
        return payload
    by_date: dict[str, dict[str, Any]] = {}
    for concept in payload.get("dateConcepts") or []:
        date_key = str(concept.get("date") or "").strip()
        if date_key:
            by_date[date_key] = dict(concept)
    completed: list[dict[str, Any]] = []
    for fallback in expected:
        key = fallback["date"]
        existing = by_date.get(key)
        if not existing:
            completed.append(fallback)
            continue
        completed.append(
            {
                "date": key,
                "dayOfWeek": str(existing.get("dayOfWeek") or fallback["dayOfWeek"]),
                "format": str(existing.get("format") or fallback["format"]),
                "formatReason": str(existing.get("formatReason") or fallback["formatReason"]),
                "conceptInstruction": str(
                    existing.get("conceptInstruction") or fallback["conceptInstruction"]
                ),
                "relevanceDescription": str(
                    existing.get("relevanceDescription") or fallback["relevanceDescription"]
                ),
                **(
                    {"promotedMenuItems": existing.get("promotedMenuItems")}
                    if existing.get("promotedMenuItems")
                    else {}
                ),
            }
        )
    out: PostSchedulerOutput = {"dateConcepts": completed, "daySummary": payload["daySummary"]}
    if "promotionCandidates" in payload:
        out["promotionCandidates"] = payload.get("promotionCandidates")
    return out


async def generate_campaign_concepts(state: PostSchedulerState) -> dict[str, Any]:
    """Generate date-level campaign concepts from brief context and available days."""
    base = _build_base_output(state)
    if base["daySummary"]["weekdayCount"] + base["daySummary"]["weekendCount"] == 0:
        return {"generated_output": base}
    llm = get_llm_structured().with_structured_output(PostSchedulerDraftOutput)
    _trace_agent_event(state, "chat_model_start")
    generated = await llm.ainvoke(
        [
            SystemMessage(content=POST_SCHEDULER_SYSTEM),
            HumanMessage(content=str(state.get("generation_context_markdown") or "").strip()),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    normalized = _normalize_generated_output(generated.model_dump(exclude_none=True), state=state)
    normalized = _ensure_full_date_coverage(normalized, state=state)
    return {"generated_output": normalized}


async def persist_result(state: PostSchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate/coerce and persist post-scheduler payload via milestone data upsert."""
    payload = _normalize_generated_output(state.get("generated_output"), state=state)
    payload = _ensure_full_date_coverage(payload, state=state)
    normalized_candidates = _normalize_promotion_candidates(state.get("promotion_candidates"))
    if normalized_candidates is not None:
        payload["promotionCandidates"] = normalized_candidates
    allowed_menu_names = _extract_allowed_menu_names(state)
    payload = _enforce_allowed_menu_names(payload, allowed_menu_names=allowed_menu_names)
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
