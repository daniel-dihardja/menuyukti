"""Nodes for post_lineup fetch, LLM planning, and persistence."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import (
    build_post_lineup_from_plan,
    validate_monthly_pin_groups,
)
from agents_app.agents.core.milestone_run.post_lineup.prompts import format_post_lineup_system
from agents_app.agents.core.milestone_run.post_lineup.state import PostLineupOutput, PostLineupState
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
    dates_prior_error_message,
    extract_dates_data,
    extract_dates_row,
    extract_menu_clusterer_data,
    extract_menu_clusterer_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
)
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

POST_LINEUP_MERGE_MAX_ATTEMPTS = 3


def _trace(state: PostLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: PostLineupState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: PostLineupState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "post_lineup":
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
        "## Milestone input (owner notes)\n\n"
        "_Optional owner guidance for post emphasis. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _food_leads(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = data.get("foodLeads")
    if not isinstance(raw_items, list):
        return []
    return [row for row in raw_items if isinstance(row, dict)]


def _groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_groups = data.get("groups")
    if not isinstance(raw_groups, list):
        return []
    return [row for row in raw_groups if isinstance(row, dict)]


def _compact_food_lead(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(item.get("name") or "").strip(),
        "role": item.get("role"),
        "category": item.get("category"),
        "storytellingFit": item.get("storytellingFit"),
    }


def _compact_group(group: dict[str, Any]) -> dict[str, Any]:
    raw_items = group.get("items")
    items: list[dict[str, Any]] = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            items.append(
                {
                    "name": str(item.get("name") or "").strip(),
                    "role": item.get("role"),
                    "category": item.get("category"),
                    "storytellingFit": item.get("storytellingFit"),
                    "reelMoment": item.get("reelMoment"),
                }
            )
    return {
        "id": str(group.get("id") or "").strip(),
        "leadName": str(group.get("leadName") or "").strip(),
        "items": items,
        "clusterDescription": group.get("clusterDescription"),
        "strategyFocus": group.get("strategyFocus"),
        "creativeRole": group.get("creativeRole"),
        "mix": group.get("mix"),
        "scheduleHints": group.get("scheduleHints"),
    }


def _build_generation_context(
    *,
    campaign_brief_data: dict[str, Any],
    groups: list[dict[str, Any]],
    food_leads: list[dict[str, Any]],
    start_date: str,
    end_date: str,
    weeks: list[dict[str, Any]],
    owner_notes_markdown: str,
) -> str:
    brief_excerpt = {
        "venueSnapshot": campaign_brief_data.get("venueSnapshot"),
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
        "audienceHypotheses": campaign_brief_data.get("audienceHypotheses"),
        "proofOrientedAngles": campaign_brief_data.get("proofOrientedAngles"),
        "mainCategory": campaign_brief_data.get("mainCategory"),
        "toneGuardrails": campaign_brief_data.get("toneGuardrails"),
        "messageHierarchy": campaign_brief_data.get("messageHierarchy"),
        "offerAndCtaPlan": campaign_brief_data.get("offerAndCtaPlan"),
    }
    compact_groups = [_compact_group(group) for group in groups]
    compact_leads = [_compact_food_lead(item) for item in food_leads]
    role_by_group_id = [
        f"{group['id']}: creativeRole={group.get('creativeRole') or 'unknown'}"
        for group in compact_groups
        if group.get("id")
    ]
    sections = [
        "## Campaign window\n```json\n"
        f"{json.dumps({'startDate': start_date, 'endDate': end_date, 'weekCount': len(weeks)}, ensure_ascii=False, indent=2)}\n```",
        "## Week plan (one weekly post per week)\n```json\n"
        f"{json.dumps(weeks, ensure_ascii=False, indent=2)}\n```",
        "## Campaign brief (excerpt)\n```json\n"
        f"{json.dumps(brief_excerpt, ensure_ascii=False, indent=2)}\n```",
        "## Top food leads (signature pool from menu tagger)\n```json\n"
        f"{json.dumps(compact_leads, ensure_ascii=False, indent=2)}\n```",
        "## Menu clusterer groups\n```json\n"
        f"{json.dumps(compact_groups, ensure_ascii=False, indent=2)}\n```",
        "## Group creativeRole map (monthly pin: static_hero / hero only)\n"
        + ("\n".join(role_by_group_id) if role_by_group_id else "_No groups._"),
    ]
    if owner_notes_markdown.strip():
        sections.append(owner_notes_markdown.strip())
    return "\n\n".join(sections)


class PostLineupPostPlanDraft(BaseModel):
    intent: Literal["pinned_monthly_menu", "weekday_lunch_post"]
    title: str
    groupIds: list[str] = Field(min_length=1)
    description: str = Field(min_length=1)
    captionGuidance: str = Field(min_length=1)
    weekIndex: int | None = None


class PostLineupDraftOutput(BaseModel):
    monthlyPost: PostLineupPostPlanDraft
    weeklyPosts: list[PostLineupPostPlanDraft]


def _merge_correction_message(error: ValueError, *, expected_week_count: int) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous post lineup plan could not be merged with the menu clusterer data.\n\n"
            f"Error: {error}\n\n"
            f"Return a corrected JSON object only. weeklyPosts must contain exactly "
            f"{expected_week_count} entries (one per week in the campaign window). "
            "Use valid groupIds from the provided groups, keep required intents, "
            "match weekIndex values from the week plan, and provide non-empty titles, "
            "descriptions, and captionGuidance. "
            "monthlyPost.groupIds must include all static_hero groups (hero-only); "
            "do not include variety, proof, or value groups."
        )
    )


def _normalize_generated_output(payload: Any) -> PostLineupOutput:
    if not isinstance(payload, dict):
        raise ValueError("post_lineup output validation failed")
    normalized, error = validate_skill_output("post_lineup", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "post_lineup output validation failed")
    return normalized  # type: ignore[return-value]


async def fetch_and_prepare(state: PostLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="post_lineup")

    prior_json = str(state.get("prior_milestones_data") or "")
    dates_data = extract_dates_data(prior_json)
    if dates_data is None:
        raise ValueError(dates_prior_error_message(prior_json, milestone_id="post_lineup"))

    start_date = str(dates_data.get("startDate") or "").strip()
    end_date = str(dates_data.get("endDate") or "").strip()
    if not start_date or not end_date:
        raise ValueError("post_lineup requires prior dates milestone with startDate and endDate")

    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(campaign_brief_prior_error_message(prior_json, milestone_id="post_lineup"))

    menu_clusterer_data = extract_menu_clusterer_data(prior_json)
    if menu_clusterer_data is None:
        raise ValueError("post_lineup requires a prior menu_clusterer milestone with saved groups")

    groups = _groups(menu_clusterer_data)
    if not groups:
        raise ValueError("post_lineup requires at least one group in prior menu_clusterer data")

    food_leads = _food_leads(menu_clusterer_data)
    if not food_leads:
        raise ValueError("post_lineup requires at least one food lead in prior menu_clusterer data")

    computed_weeks = campaign_weeks(
        start_date,
        end_date,
        campaign_brief_data=campaign_brief_data,
    )
    if not computed_weeks:
        raise ValueError("post_lineup requires a valid campaign window with at least one week")

    campaign_brief_row = extract_restaurant_campaign_brief_row(prior_json)
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    menu_clusterer_row = extract_menu_clusterer_row(prior_json)
    source_menu_clusterer_title = ""
    if isinstance(menu_clusterer_row, dict):
        title = menu_clusterer_row.get("title")
        if isinstance(title, str) and title.strip():
            source_menu_clusterer_title = title.strip()

    dates_row = extract_dates_row(prior_json)
    source_dates_title = ""
    if isinstance(dates_row, dict):
        title = dates_row.get("title")
        if isinstance(title, str) and title.strip():
            source_dates_title = title.strip()

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "dates_data": dates_data,
        "start_date": start_date,
        "end_date": end_date,
        "source_dates_title": source_dates_title,
        "campaign_weeks": computed_weeks,
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "groups": groups,
        "food_leads": food_leads,
        "source_menu_clusterer_title": source_menu_clusterer_title,
    }


async def plan_posts(state: PostLineupState) -> dict[str, Any]:
    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("post_lineup requires campaign_brief_data")

    groups = state.get("groups") or []
    food_leads = state.get("food_leads") or []
    if not groups:
        raise ValueError("post_lineup requires groups")
    if not food_leads:
        raise ValueError("post_lineup requires food_leads")

    start_date = str(state.get("start_date") or "").strip()
    end_date = str(state.get("end_date") or "").strip()
    if not start_date or not end_date:
        raise ValueError("post_lineup requires start_date and end_date from prior dates milestone")

    campaign_weeks_list = state.get("campaign_weeks") or []
    if not campaign_weeks_list:
        raise ValueError("post_lineup requires campaign_weeks")

    week_plan = [
        {
            "weekIndex": week.week_index,
            "weekStart": week.week_start,
            "weekEnd": week.week_end,
            "postDate": week.post_date,
        }
        for week in campaign_weeks_list
    ]
    expected_week_count = len(week_plan)

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    validate_monthly_pin_groups(groups)

    generation_context = _build_generation_context(
        campaign_brief_data=campaign_brief_data,
        groups=groups,
        food_leads=food_leads,
        start_date=start_date,
        end_date=end_date,
        weeks=week_plan,
        owner_notes_markdown=str(state.get("owner_notes_markdown") or ""),
    )

    _trace(state, "plan_posts_generate")
    _trace_agent_event(state, "chat_model_start")

    base_messages: list[BaseMessage] = [
        SystemMessage(content=format_post_lineup_system()),
        HumanMessage(content=generation_context),
    ]
    merge_error: ValueError | None = None

    for attempt in range(1, POST_LINEUP_MERGE_MAX_ATTEMPTS + 1):
        messages = list(base_messages)
        if merge_error is not None:
            messages.append(
                _merge_correction_message(merge_error, expected_week_count=expected_week_count)
            )
        try:
            generated = await structured_ainvoke_from_run_config(
                PostLineupDraftOutput,
                messages,
            )
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise

        try:
            monthly_post = generated.monthlyPost.model_dump()
            weekly_posts = [post.model_dump() for post in generated.weeklyPosts]
            if monthly_post.get("intent") != "pinned_monthly_menu":
                raise ValueError("monthlyPost intent must be pinned_monthly_menu")
            if len(weekly_posts) != expected_week_count:
                raise ValueError(
                    f"weeklyPosts must contain exactly {expected_week_count} entries; "
                    f"got {len(weekly_posts)}"
                )

            payload = build_post_lineup_from_plan(
                monthly_post=monthly_post,
                weekly_posts=weekly_posts,
                campaign_weeks=campaign_weeks_list,
                groups=groups,
                food_leads=food_leads,
                campaign_brief_data=campaign_brief_data,
                start_date=start_date,
                end_date=end_date,
                source_menu_clusterer_title=str(state.get("source_menu_clusterer_title") or ""),
                source_campaign_brief_title=str(state.get("source_campaign_brief_title") or ""),
                source_dates_title=str(state.get("source_dates_title") or ""),
                notes=owner_notes,
            )
            normalized = _normalize_generated_output(payload)
            return {"generated_output": normalized}
        except ValueError as exc:
            merge_error = exc
            if attempt >= POST_LINEUP_MERGE_MAX_ATTEMPTS:
                raise ValueError(
                    f"post_lineup planning failed after {attempt} attempts: {exc}"
                ) from exc

    raise ValueError("post_lineup planning failed")


async def persist_result(state: PostLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    payload = _normalize_generated_output(state.get("generated_output"))
    await upsert_milestonedata_node(
        str(state["milestone_id"]),
        int(state["location_id"]),
        payload,
        str(state["user_id"]),
        client=client,
    )
    result_data = json.dumps(payload, ensure_ascii=False, indent=2)
    return {
        "result_data": result_data,
        "milestone_data": payload,
        "milestonedata_written": True,
        "raw_data": result_data,
    }
