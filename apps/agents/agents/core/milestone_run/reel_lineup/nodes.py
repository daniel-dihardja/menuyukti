"""Nodes for reel_lineup fetch, clustering, and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    campaign_brief_prior_error_message,
    extract_menu_tagger_data,
    extract_menu_tagger_row,
    extract_restaurant_campaign_brief_data,
    extract_restaurant_campaign_brief_row,
)
from agents_app.agents.core.milestone_run.reel_lineup.cluster import (
    REEL_LINEUP_MIN_GROUP_COUNT,
    food_items_only,
    merge_llm_clusters,
    rank_top_food_leads,
    resolve_target_group_count,
)
from agents_app.agents.core.milestone_run.reel_lineup.prompts import format_reel_lineup_system
from agents_app.agents.core.milestone_run.reel_lineup.state import ReelLineupOutput, ReelLineupState
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field, create_model


def _read_milestone_input_value(milestone_input: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(milestone_input, dict):
        return {}
    if milestone_input.get("type") != "reel_lineup":
        return {}
    value = milestone_input.get("value")
    return value if isinstance(value, dict) else {}


def _read_target_group_count(milestone_input: dict[str, Any] | None, *, food_item_count: int) -> int:
    raw = _read_milestone_input_value(milestone_input).get("targetGroupCount")
    parsed: int | None = None
    if isinstance(raw, int):
        parsed = raw
    elif isinstance(raw, str) and raw.strip().isdigit():
        parsed = int(raw.strip())
    return resolve_target_group_count(parsed, food_item_count=food_item_count)


def _trace(state: ReelLineupState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: ReelLineupState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: ReelLineupState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "reel_lineup":
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
        "_Optional owner guidance for grouping emphasis. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _menu_tagger_items(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = data.get("items")
    if not isinstance(raw_items, list):
        return []
    return [row for row in raw_items if isinstance(row, dict)]


def _normalize_generated_output(payload: Any) -> ReelLineupOutput:
    if not isinstance(payload, dict):
        raise ValueError("reel_lineup output validation failed")
    normalized, error = validate_skill_output("reel_lineup", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "reel_lineup output validation failed")
    return normalized  # type: ignore[return-value]


class ReelLineupClusterDraft(BaseModel):
    themeLabel: str
    leadItemName: str
    supportingItemNames: list[str] = Field(default_factory=list, max_length=4)
    clusterDescription: str = Field(
        min_length=40,
        description=(
            "Why these items are grouped, why the angle fits this venue's concept, "
            "and why it works as a Reel."
        ),
    )


def _reel_lineup_draft_output_model(min_groups: int) -> type[BaseModel]:
    return create_model(
        "ReelLineupDraftOutput",
        clusters=(list[ReelLineupClusterDraft], Field(min_length=min_groups)),
        __base__=BaseModel,
    )


REEL_LINEUP_MERGE_MAX_ATTEMPTS = 3


def _merge_correction_message(error: ValueError) -> HumanMessage:
    return HumanMessage(
        content=(
            "Your previous cluster draft could not be merged with the menu data.\n\n"
            f"Error: {error}\n\n"
            "Return a corrected JSON object only. Use exact item names from the tagged food list, "
            "choose leadItemName only from the top-5 lead list, and keep each clusterDescription "
            "at least 40 characters."
        )
    )


def _compact_food_item(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(item.get("name") or "").strip(),
        "role": item.get("role"),
        "category": item.get("category"),
        "popularity": item.get("popularity"),
        "storytellingFit": item.get("storytellingFit"),
        "tags": item.get("tags"),
    }


def _build_generation_context(
    *,
    campaign_brief_data: dict[str, Any],
    menu_tagger_items: list[dict[str, Any]],
    top5_leads: list[dict[str, Any]],
    owner_notes_markdown: str,
    target_group_count: int,
) -> str:
    brief_excerpt = {
        "venueSnapshot": campaign_brief_data.get("venueSnapshot"),
        "overallStrategy": campaign_brief_data.get("overallStrategy"),
        "contentPillars": campaign_brief_data.get("contentPillars"),
        "audienceHypotheses": campaign_brief_data.get("audienceHypotheses"),
        "proofOrientedAngles": campaign_brief_data.get("proofOrientedAngles"),
    }
    food_items = [_compact_food_item(item) for item in menu_tagger_items if _is_food_kind(item)]
    top5_names = [str(item.get("name") or "").strip() for item in top5_leads]

    sections = [
        "## Target cluster count\n"
        f"Produce exactly **{target_group_count}** food Reel clusters.",
        "## Campaign brief (excerpt)\n```json\n"
        f"{json.dumps(brief_excerpt, ensure_ascii=False, indent=2)}\n```",
        "## Top-5 food leads (position 1 must come from this list only)\n```json\n"
        f"{json.dumps(top5_names, ensure_ascii=False, indent=2)}\n```",
        "## Tagged food items\n```json\n"
        f"{json.dumps(food_items, ensure_ascii=False, indent=2)}\n```",
    ]
    if owner_notes_markdown.strip():
        sections.append(owner_notes_markdown.strip())
    return "\n\n".join(sections)


def _is_food_kind(item: dict[str, Any]) -> bool:
    tags = item.get("tags")
    if not isinstance(tags, dict):
        return False
    return str(tags.get("kind") or "").strip() == "food"


async def fetch_and_prepare(state: ReelLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="reel_lineup")

    prior_json = str(state.get("prior_milestones_data") or "")
    campaign_brief_data = extract_restaurant_campaign_brief_data(prior_json)
    if campaign_brief_data is None:
        raise ValueError(campaign_brief_prior_error_message(prior_json, milestone_id="reel_lineup"))

    menu_tagger_data = extract_menu_tagger_data(prior_json)
    if menu_tagger_data is None:
        raise ValueError(
            "reel_lineup requires a prior menu_tagger milestone with saved tagged items"
        )

    menu_tagger_items = _menu_tagger_items(menu_tagger_data)
    if not menu_tagger_items:
        raise ValueError("reel_lineup requires at least one tagged item in prior menu_tagger data")

    food_count = len(food_items_only(menu_tagger_items))
    target_group_count = _read_target_group_count(
        state.get("milestone_input") if isinstance(state.get("milestone_input"), dict) else None,
        food_item_count=food_count,
    )
    if food_count < target_group_count:
        raise ValueError(
            f"reel_lineup requires at least {target_group_count} tagged food items in prior "
            f"menu_tagger data (Input tab target); got {food_count}. Re-run menu_tagger or "
            "lower the target group count."
        )
    if food_count < REEL_LINEUP_MIN_GROUP_COUNT:
        raise ValueError(
            f"reel_lineup requires at least {REEL_LINEUP_MIN_GROUP_COUNT} tagged food items in prior "
            f"menu_tagger data; got {food_count}. Re-run menu_tagger or widen promotion candidates."
        )

    campaign_brief_row = extract_restaurant_campaign_brief_row(prior_json)
    source_campaign_brief_title = ""
    if isinstance(campaign_brief_row, dict):
        brief_title = campaign_brief_row.get("title")
        if isinstance(brief_title, str) and brief_title.strip():
            source_campaign_brief_title = brief_title.strip()

    menu_tagger_row = extract_menu_tagger_row(prior_json)
    source_title = ""
    if isinstance(menu_tagger_row, dict):
        title = menu_tagger_row.get("title")
        if isinstance(title, str) and title.strip():
            source_title = title.strip()

    return {
        "owner_notes_markdown": _fmt_owner_notes(state),
        "campaign_brief_data": campaign_brief_data,
        "source_campaign_brief_title": source_campaign_brief_title,
        "menu_tagger_items": menu_tagger_items,
        "source_menu_tagger_title": source_title,
        "target_group_count": target_group_count,
    }


async def build_lineup(state: ReelLineupState) -> dict[str, Any]:
    menu_tagger_items = state.get("menu_tagger_items") or []
    campaign_brief_data = state.get("campaign_brief_data")
    if not isinstance(campaign_brief_data, dict):
        raise ValueError("reel_lineup requires campaign_brief_data")

    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else owner_md

    target_group_count = int(state.get("target_group_count") or REEL_LINEUP_MIN_GROUP_COUNT)

    top5_leads = rank_top_food_leads(menu_tagger_items)
    generation_context = _build_generation_context(
        campaign_brief_data=campaign_brief_data,
        menu_tagger_items=menu_tagger_items,
        top5_leads=top5_leads,
        owner_notes_markdown=str(state.get("owner_notes_markdown") or ""),
        target_group_count=target_group_count,
    )

    draft_output_model = _reel_lineup_draft_output_model(target_group_count)
    system_prompt = format_reel_lineup_system(
        target_group_count=target_group_count,
        min_group_count=REEL_LINEUP_MIN_GROUP_COUNT,
    )

    _trace(state, "build_lineup_generate", targetGroupCount=target_group_count)
    _trace_agent_event(state, "chat_model_start")

    base_messages: list[BaseMessage] = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=generation_context),
    ]
    generated: BaseModel | None = None
    merge_error: ValueError | None = None

    for attempt in range(1, REEL_LINEUP_MERGE_MAX_ATTEMPTS + 1):
        messages = list(base_messages)
        if merge_error is not None:
            messages.append(_merge_correction_message(merge_error))
        try:
            generated = await structured_ainvoke_from_run_config(
                draft_output_model,
                messages,
            )
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise

        try:
            clusters = getattr(generated, "clusters", None)
            if not isinstance(clusters, list):
                raise ValueError("reel_lineup LLM draft missing clusters")
            payload = merge_llm_clusters(
                clusters,
                menu_tagger_items=menu_tagger_items,
                top5_leads=top5_leads,
                campaign_brief_data=campaign_brief_data,
                source_menu_tagger_title=str(state.get("source_menu_tagger_title") or ""),
                source_campaign_brief_title=str(state.get("source_campaign_brief_title") or ""),
                notes=owner_notes,
                min_groups=target_group_count,
                target_group_count=target_group_count,
            )
            normalized = _normalize_generated_output(payload)
            return {"generated_output": normalized}
        except ValueError as exc:
            merge_error = exc
            if attempt >= REEL_LINEUP_MERGE_MAX_ATTEMPTS:
                raise ValueError(f"reel_lineup clustering failed after {attempt} attempts: {exc}") from exc

    raise ValueError("reel_lineup clustering failed")


async def persist_result(state: ReelLineupState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
