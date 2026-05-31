"""Nodes for post_lineup fetch, LLM planning, and persistence."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_lineup.build import build_post_lineup_from_plan
from agents_app.agents.core.milestone_run.post_lineup.prompts import format_post_lineup_system
from agents_app.agents.core.milestone_run.post_lineup.state import PostLineupOutput, PostLineupState
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
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
    owner_notes_markdown: str,
) -> str:
    brief_excerpt = {
        "venueSnapshot": campaign_brief_data.get("venueSnapshot"),
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
        "audienceHypotheses": campaign_brief_data.get("audienceHypotheses"),
        "proofOrientedAngles": campaign_brief_data.get("proofOrientedAngles"),
        "mainCategory": campaign_brief_data.get("mainCategory"),
    }
    compact_groups = [_compact_group(group) for group in groups]
    sections = [
        "## Campaign brief (excerpt)\n```json\n"
        f"{json.dumps(brief_excerpt, ensure_ascii=False, indent=2)}\n```",
        "## Menu clusterer groups\n```json\n"
        f"{json.dumps(compact_groups, ensure_ascii=False, indent=2)}\n```",
    ]
    if owner_notes_markdown.strip():
        sections.append(owner_notes_markdown.strip())
    return "\n\n".join(sections)


class PostLineupPostPlanDraft(BaseModel):
    intent: Literal["pinned_monthly_menu", "weekday_lunch_post"]
    title: str
    groupIds: list[str] = Field(min_length=1)
    rationale: str = Field(min_length=1)


class PostLineupDraftOutput(BaseModel):
    monthlyPost: PostLineupPostPlanDraft
    weeklyPost: PostLineupPostPlanDraft


def _merge_correction_message(error: ValueError) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous post lineup plan could not be merged with the menu clusterer data.\n\n"
            f"Error: {error}\n\n"
            "Return a corrected JSON object only. Use valid groupIds from the provided groups, "
            "keep both required intents, and provide non-empty titles."
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
    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(
            campaign_brief_prior_error_message(prior_json, milestone_id="post_lineup")
        )

    menu_clusterer_data = extract_menu_clusterer_data(prior_json)
    if menu_clusterer_data is None:
        raise ValueError(
            "post_lineup requires a prior menu_clusterer milestone with saved groups"
        )

    groups = _groups(menu_clusterer_data)
    if not groups:
        raise ValueError("post_lineup requires at least one group in prior menu_clusterer data")

    food_leads = _food_leads(menu_clusterer_data)
    if not food_leads:
        raise ValueError("post_lineup requires at least one food lead in prior menu_clusterer data")

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

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
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

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    generation_context = _build_generation_context(
        campaign_brief_data=campaign_brief_data,
        groups=groups,
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
            messages.append(_merge_correction_message(merge_error))
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
            weekly_post = generated.weeklyPost.model_dump()
            if monthly_post.get("intent") != "pinned_monthly_menu":
                raise ValueError("monthlyPost intent must be pinned_monthly_menu")
            if weekly_post.get("intent") != "weekday_lunch_post":
                raise ValueError("weeklyPost intent must be weekday_lunch_post")

            payload = build_post_lineup_from_plan(
                monthly_post=monthly_post,
                weekly_post=weekly_post,
                groups=groups,
                food_leads=food_leads,
                campaign_brief_data=campaign_brief_data,
                source_menu_clusterer_title=str(state.get("source_menu_clusterer_title") or ""),
                source_campaign_brief_title=str(state.get("source_campaign_brief_title") or ""),
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
