"""Nodes for dedicated post-scheduler generation and persistence."""

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
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_scheduler.state import (
    PostSchedulerOutput,
    PostSchedulerState,
)
from langgraph.config import get_stream_writer

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
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if injected:
        sections.append(injected)
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


def _fallback_output() -> PostSchedulerOutput:
    return {"posts": [], "daySummary": {"weekdayCount": 0, "weekendCount": 0}}


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
    posts = payload.get("posts") or []
    if not posts:
        return payload
    if not allowed_menu_names:
        return payload

    allowed_lookup = {name.casefold() for name in allowed_menu_names}
    fallback_menu = allowed_menu_names[0]
    normalized_posts: list[dict[str, Any]] = []
    for post in posts:
        menu_items = post.get("promotedMenuItems") or []
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
        if not kept:
            kept = [fallback_menu]
        next_post = dict(post)
        next_post["promotedMenuItems"] = kept
        normalized_posts.append(next_post)
    out: PostSchedulerOutput = {"posts": normalized_posts, "daySummary": payload["daySummary"]}
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


def derive_day_summary(state: PostSchedulerState) -> dict[str, Any]:
    """Build deterministic day summary from campaign start/end (inclusive)."""
    start_date, end_date = _extract_campaign_date_bounds(state)
    if start_date is None or end_date is None:
        return {"generated_output": _fallback_output()}
    weekday_count, weekend_count = _count_weekday_weekend_days(start_date, end_date)
    return {
        "generated_output": {
            "posts": [],
            "daySummary": {
                "weekdayCount": weekday_count,
                "weekendCount": weekend_count,
            },
        }
    }


def _normalize_generated_output(payload: Any) -> PostSchedulerOutput:
    if not isinstance(payload, dict):
        return _fallback_output()
    rows = payload.get("posts")
    if not isinstance(rows, list):
        return _fallback_output()
    summary = payload.get("daySummary")
    if isinstance(summary, dict):
        weekday_count = int(summary.get("weekdayCount") or 0)
        weekend_count = int(summary.get("weekendCount") or 0)
    else:
        weekday_count = 0
        weekend_count = 0
    normalized_rows: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        menu_items = [str(x).strip() for x in row.get("promotedMenuItems", []) if str(x).strip()]
        normalized_rows.append(
            {
                "dayOfWeek": str(row.get("dayOfWeek") or "").strip(),
                "date": str(row.get("date") or "").strip(),
                "time": str(row.get("time") or "").strip(),
                "postType": str(row.get("postType") or "").strip(),
                "contentType": str(row.get("contentType") or "").strip(),
                "promotedMenuItems": menu_items,
                "captionIdea": str(row.get("captionIdea") or "").strip(),
            }
        )
    return {
        "posts": normalized_rows,
        "daySummary": {
            "weekdayCount": max(0, weekday_count),
            "weekendCount": max(0, weekend_count),
        },
    }


async def persist_result(state: PostSchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate/coerce and persist post-scheduler payload via milestone data upsert."""
    payload = _normalize_generated_output(state.get("generated_output"))
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
