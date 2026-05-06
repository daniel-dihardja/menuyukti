"""Nodes for dedicated post-scheduler generation and persistence."""

from __future__ import annotations

import json
import re
import time
from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_campaign_schedule_plan,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
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
_DEBUG_LOG_PATH = (
    "/Users/danieldihardja/dev/AI-Products/menuyukti/v3/.cursor/debug-c27d4e.log"
)


class PostSchedulerPostDraft(BaseModel):
    dayOfWeek: str
    date: str
    time: str
    postType: Literal["Reel", "Post"]
    contentType: Literal["Carousel", "Single"]
    promotedMenuItems: list[str] = Field(default_factory=list)
    captionIdea: str


class PostSchedulerDraftOutput(BaseModel):
    posts: list[PostSchedulerPostDraft] = Field(default_factory=list)


def _debug_log(
    *,
    run_id: str,
    hypothesis_id: str,
    location: str,
    message: str,
    data: dict[str, Any],
) -> None:
    payload = {
        "sessionId": "c27d4e",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with open(_DEBUG_LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass


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
        "for cadence and timing, but keep menu items grounded in prior promotion candidates._\n\n"
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
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if injected:
        sections.append(injected)
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


def _fallback_output() -> PostSchedulerOutput:
    return {"posts": []}


def _parse_prior_rows(prior_milestones_data: Any) -> list[dict[str, Any]]:
    if isinstance(prior_milestones_data, str):
        raw = prior_milestones_data.strip()
        if not raw:
            return []
        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError:
            return []
    else:
        decoded = prior_milestones_data
    if not isinstance(decoded, list):
        return []
    return [row for row in decoded if isinstance(row, dict)]


def _extract_allowed_menu_names(state: PostSchedulerState) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    source_counts = {"scheduler_slot": 0, "promotion_idea": 0, "category_highlight": 0, "menu_category": 0}

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

    # Also ingest prior promotion-candidates output.
    for row in _parse_prior_rows(state.get("prior_milestones_data")):
        preset_id = row.get("presetId")
        if isinstance(preset_id, str) and preset_id.strip() != "promotion_candidates":
            continue
        data = row.get("data")
        if not isinstance(data, dict):
            continue
        for item in data.get("promotionIdeas") or []:
            _add(item, "promotion_idea")
        categories = data.get("categories")
        if isinstance(categories, dict):
            for cat in categories.values():
                if not isinstance(cat, dict):
                    continue
                for item in cat.get("starHighlights") or []:
                    _add(item, "category_highlight")
                for item in cat.get("puzzleHighlights") or []:
                    _add(item, "category_highlight")
                _add(cat.get("menuCategory"), "menu_category")

    # region agent log
    _debug_log(
        run_id=str(state.get("run_id") or "unknown"),
        hypothesis_id="H6",
        location="post_scheduler/nodes.py:_extract_allowed_menu_names",
        message="allowed menu names resolved",
        data={
            "count": len(out),
            "sample": out[:5],
            "has_scheduler_plan": isinstance(state.get("scheduler_plan"), dict),
            "prior_len": len(str(state.get("prior_milestones_data") or "")),
            "source_counts": source_counts,
            "contains_air_mineral": any(x.casefold() == "air mineral" for x in out),
        },
    )
    # endregion
    return out


def _enforce_allowed_menu_names(
    payload: PostSchedulerOutput, *, allowed_menu_names: list[str]
) -> PostSchedulerOutput:
    posts = payload.get("posts") or []
    if not posts:
        return payload
    if not allowed_menu_names:
        # region agent log
        _debug_log(
            run_id="unknown",
            hypothesis_id="H2",
            location="post_scheduler/nodes.py:_enforce_allowed_menu_names",
            message="allowed menu names empty; payload left unchanged",
            data={"input_posts": len(posts)},
        )
        # endregion
        return payload

    allowed_lookup = {name.casefold() for name in allowed_menu_names}
    fallback_menu = allowed_menu_names[0]
    normalized_posts: list[dict[str, Any]] = []
    first_post_checks: list[dict[str, Any]] = []
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
            if not first_post_checks and len(normalized_posts) == 0:
                first_post_checks.append({"item": text, "in_allowed_lookup": key in allowed_lookup})
            if key not in allowed_lookup or key in seen:
                continue
            seen.add(key)
            kept.append(text)
        if not kept:
            kept = [fallback_menu]
        next_post = dict(post)
        next_post["promotedMenuItems"] = kept
        normalized_posts.append(next_post)
    # region agent log
    _debug_log(
        run_id="unknown",
            hypothesis_id="H3",
        location="post_scheduler/nodes.py:_enforce_allowed_menu_names",
        message="menu items filtered against allowed set",
        data={
            "allowed_count": len(allowed_menu_names),
            "input_posts": len(posts),
            "output_posts": len(normalized_posts),
            "first_post_items": normalized_posts[0].get("promotedMenuItems", [])
            if normalized_posts
            else [],
                "first_post_checks": first_post_checks,
        },
    )
    # endregion
    return {"posts": normalized_posts}


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


async def generate_draft(state: PostSchedulerState) -> dict[str, Any]:
    """Generate structured post-scheduler output from prepared context."""
    _trace_agent_event(state, "chat_model_start")
    llm = get_llm_structured().with_structured_output(PostSchedulerDraftOutput)
    generated = await llm.ainvoke(
        [
            SystemMessage(content=POST_SCHEDULER_SYSTEM),
            HumanMessage(content=str(state.get("generation_context_markdown", ""))),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": generated.model_dump(exclude_none=True)}


def _normalize_generated_output(payload: Any) -> PostSchedulerOutput:
    if not isinstance(payload, dict):
        return _fallback_output()
    rows = payload.get("posts")
    if not isinstance(rows, list):
        return _fallback_output()
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
    return {"posts": normalized_rows}


async def persist_result(state: PostSchedulerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate/coerce and persist post-scheduler payload via milestone data upsert."""
    payload = _normalize_generated_output(state.get("generated_output"))
    # region agent log
    _debug_log(
        run_id=str(state.get("run_id") or "unknown"),
        hypothesis_id="H4",
        location="post_scheduler/nodes.py:persist_result",
        message="raw generated output normalized",
        data={
            "posts_count": len(payload.get("posts") or []),
            "first_post_raw_items": (payload.get("posts") or [{}])[0].get("promotedMenuItems", []),
        },
    )
    # endregion
    allowed_menu_names = _extract_allowed_menu_names(state)
    payload = _enforce_allowed_menu_names(payload, allowed_menu_names=allowed_menu_names)
    # region agent log
    _debug_log(
        run_id=str(state.get("run_id") or "unknown"),
        hypothesis_id="H5",
        location="post_scheduler/nodes.py:persist_result",
        message="payload after enforcement before validation",
        data={
            "allowed_count": len(allowed_menu_names),
            "posts_count": len(payload.get("posts") or []),
            "first_post_items_after": (payload.get("posts") or [{}])[0].get("promotedMenuItems", []),
        },
    )
    # endregion
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
