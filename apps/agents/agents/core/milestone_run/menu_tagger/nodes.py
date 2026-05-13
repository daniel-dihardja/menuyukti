"""Nodes for menu-tagger fetch, LLM tagging, and persistence."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_llm_from_milestone_run_config,
)
from agents_app.agents.core.milestone_run.menu_tagger.prompts import MENU_TAGGER_SYSTEM
from agents_app.agents.core.milestone_run.menu_tagger.state import (
    MenuTaggerItem,
    MenuTaggerOutput,
    MenuTaggerState,
    MenuTaggerTags,
    MenuTaggerUsedTags,
)
from agents_app.agents.core.milestone_run.menu_tagger.taxonomy import (
    CONTENT_ANGLE_VALUES,
    COURSE_VALUES,
    DEFAULT_KIND,
    DEFAULT_REEL_MOMENT,
    DEFAULT_SERVE_TEMP,
    DIMENSION_VALUES,
    INGREDIENT_VALUES,
    KIND_VALUES,
    MAX_CONTENT_ANGLE_TAGS,
    MAX_COURSE_TAGS,
    MAX_INGREDIENT_TAGS,
    MAX_OCCASION_TAGS,
    MAX_PREP_STYLE_TAGS,
    MAX_TASTE_TAGS,
    MAX_TEXTURE_TAGS,
    OCCASION_VALUES,
    PREP_STYLE_VALUES,
    REEL_MOMENT_VALUES,
    SERVE_TEMP_VALUES,
    TASTE_VALUES,
    TAXONOMY_VERSION,
    TEXTURE_VALUES,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_promotion_candidates_data,
    extract_promotion_candidates_row,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field


def _trace(state: MenuTaggerState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: MenuTaggerState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: MenuTaggerState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "menu_tagger":
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
        "_Optional owner guidance for ambiguous dishes. Treat as hints, not verified facts._\n\n"
        f"{text}"
    )


def _item_name(raw: Any) -> str:
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, dict):
        return str(raw.get("name") or "").strip()
    return ""


def flatten_promotion_candidates_items(data: dict[str, Any]) -> list[MenuTaggerItem]:
    """Flatten star/puzzle items from saved promotion_candidates milestonedata."""
    categories = data.get("categories")
    if not isinstance(categories, list):
        return []

    out: list[MenuTaggerItem] = []
    seen: set[tuple[str, str, str]] = set()

    for block in categories:
        if not isinstance(block, dict):
            continue
        category = str(block.get("category") or "").strip() or "(uncategorized)"
        for role in ("star", "puzzle"):
            raw_items = block.get("starItems" if role == "star" else "puzzleItems")
            if not isinstance(raw_items, list):
                continue
            for raw in raw_items:
                name = _item_name(raw)
                if not name:
                    continue
                key = (name.casefold(), role, category.casefold())
                if key in seen:
                    continue
                seen.add(key)
                out.append(
                    {
                        "name": name,
                        "role": role,  # type: ignore[typeddict-item]
                        "category": category,
                        "tags": normalize_menu_tagger_tags(None),
                    }
                )
    return out


def _filter_enum_values(
    values: list[str] | None,
    allowed: frozenset[str],
    *,
    max_count: int,
) -> list[str]:
    if not values:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for raw in values:
        text = str(raw).strip()
        if not text or text not in allowed or text in seen:
            continue
        seen.add(text)
        out.append(text)
        if len(out) >= max_count:
            break
    return out


def normalize_menu_tagger_tags(raw: dict[str, Any] | None) -> MenuTaggerTags:
    kind = str((raw or {}).get("kind") or DEFAULT_KIND).strip()
    if kind not in KIND_VALUES:
        kind = DEFAULT_KIND
    reel_moment = str((raw or {}).get("reel_moment") or DEFAULT_REEL_MOMENT).strip()
    if reel_moment not in REEL_MOMENT_VALUES:
        reel_moment = DEFAULT_REEL_MOMENT
    serve_temp = str((raw or {}).get("serve_temp") or DEFAULT_SERVE_TEMP).strip()
    if serve_temp not in SERVE_TEMP_VALUES:
        serve_temp = DEFAULT_SERVE_TEMP
    return {
        "kind": kind,  # type: ignore[typeddict-item]
        "ingredient": _filter_enum_values(
            (raw or {}).get("ingredient") if isinstance((raw or {}).get("ingredient"), list) else [],
            INGREDIENT_VALUES,
            max_count=MAX_INGREDIENT_TAGS,
        ),
        "taste": _filter_enum_values(
            (raw or {}).get("taste") if isinstance((raw or {}).get("taste"), list) else [],
            TASTE_VALUES,
            max_count=MAX_TASTE_TAGS,
        ),
        "course": _filter_enum_values(
            (raw or {}).get("course") if isinstance((raw or {}).get("course"), list) else [],
            COURSE_VALUES,
            max_count=MAX_COURSE_TAGS,
        ),
        "reel_moment": reel_moment,  # type: ignore[typeddict-item]
        "texture": _filter_enum_values(
            (raw or {}).get("texture") if isinstance((raw or {}).get("texture"), list) else [],
            TEXTURE_VALUES,
            max_count=MAX_TEXTURE_TAGS,
        ),
        "prep_style": _filter_enum_values(
            (raw or {}).get("prep_style") if isinstance((raw or {}).get("prep_style"), list) else [],
            PREP_STYLE_VALUES,
            max_count=MAX_PREP_STYLE_TAGS,
        ),
        "occasion": _filter_enum_values(
            (raw or {}).get("occasion") if isinstance((raw or {}).get("occasion"), list) else [],
            OCCASION_VALUES,
            max_count=MAX_OCCASION_TAGS,
        ),
        "serve_temp": serve_temp,  # type: ignore[typeddict-item]
        "content_angle": _filter_enum_values(
            (raw or {}).get("content_angle")
            if isinstance((raw or {}).get("content_angle"), list)
            else [],
            CONTENT_ANGLE_VALUES,
            max_count=MAX_CONTENT_ANGLE_TAGS,
        ),
    }


def compute_used_tags(items: list[MenuTaggerItem]) -> MenuTaggerUsedTags:
    kind: set[str] = set()
    ingredient: set[str] = set()
    taste: set[str] = set()
    course: set[str] = set()
    reel_moment: set[str] = set()
    texture: set[str] = set()
    prep_style: set[str] = set()
    occasion: set[str] = set()
    serve_temp: set[str] = set()
    content_angle: set[str] = set()

    for item in items:
        tags = item.get("tags") or {}
        kind_val = str(tags.get("kind") or "").strip()
        if kind_val in KIND_VALUES:
            kind.add(kind_val)
        reel_val = str(tags.get("reel_moment") or "").strip()
        if reel_val in REEL_MOMENT_VALUES:
            reel_moment.add(reel_val)
        temp_val = str(tags.get("serve_temp") or "").strip()
        if temp_val in SERVE_TEMP_VALUES:
            serve_temp.add(temp_val)
        for value in tags.get("ingredient") or []:
            text = str(value).strip()
            if text in INGREDIENT_VALUES:
                ingredient.add(text)
        for value in tags.get("taste") or []:
            text = str(value).strip()
            if text in TASTE_VALUES:
                taste.add(text)
        for value in tags.get("course") or []:
            text = str(value).strip()
            if text in COURSE_VALUES:
                course.add(text)
        for value in tags.get("texture") or []:
            text = str(value).strip()
            if text in TEXTURE_VALUES:
                texture.add(text)
        for value in tags.get("prep_style") or []:
            text = str(value).strip()
            if text in PREP_STYLE_VALUES:
                prep_style.add(text)
        for value in tags.get("occasion") or []:
            text = str(value).strip()
            if text in OCCASION_VALUES:
                occasion.add(text)
        for value in tags.get("content_angle") or []:
            text = str(value).strip()
            if text in CONTENT_ANGLE_VALUES:
                content_angle.add(text)

    return {
        "kind": sorted(kind),
        "ingredient": sorted(ingredient),
        "taste": sorted(taste),
        "course": sorted(course),
        "reel_moment": sorted(reel_moment),
        "texture": sorted(texture),
        "prep_style": sorted(prep_style),
        "occasion": sorted(occasion),
        "serve_temp": sorted(serve_temp),
        "content_angle": sorted(content_angle),
    }


def merge_tagged_items(
    input_items: list[MenuTaggerItem],
    llm_items: list[dict[str, Any]],
) -> list[MenuTaggerItem]:
    by_key: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in llm_items:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        role = str(row.get("role") or "").strip()
        category = str(row.get("category") or "").strip() or "(uncategorized)"
        if not name or role not in ("star", "puzzle"):
            continue
        by_key[(name.casefold(), role, category.casefold())] = row

    merged: list[MenuTaggerItem] = []
    for item in input_items:
        key = (item["name"].casefold(), item["role"], item["category"].casefold())
        llm_row = by_key.get(key)
        tags_raw = llm_row.get("tags") if isinstance(llm_row, dict) else None
        merged.append(
            {
                "name": item["name"],
                "role": item["role"],
                "category": item["category"],
                "tags": normalize_menu_tagger_tags(tags_raw if isinstance(tags_raw, dict) else None),
            }
        )
    return merged


def _build_generation_context(
    *,
    state: MenuTaggerState,
    owner_notes_markdown: str,
    promotion_candidates_data: dict[str, Any],
    input_items: list[MenuTaggerItem],
) -> str:
    goal = str(state.get("goal") or "").strip() or "_No goal provided._"
    criteria = state.get("criteria") or []
    sections: list[str] = [
        f"## Milestone goal\n{goal}",
        f"## Milestone criteria\n```json\n{json.dumps(criteria, ensure_ascii=False, indent=2)}\n```",
        "## Items to tag\n```json\n"
        f"{json.dumps(input_items, ensure_ascii=False, indent=2)}\n```",
        "## Prior promotion_candidates data\n```json\n"
        f"{json.dumps(promotion_candidates_data, ensure_ascii=False, indent=2)}\n```",
        "## Allowed taxonomy enums\n```json\n"
        f"{json.dumps({k: sorted(v) for k, v in DIMENSION_VALUES.items()}, ensure_ascii=False, indent=2)}\n```",
    ]
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


class MenuTaggerTagsDraft(BaseModel):
    kind: Literal["food", "drink", "other"]
    ingredient: list[str] = Field(default_factory=list, max_length=MAX_INGREDIENT_TAGS)
    taste: list[str] = Field(default_factory=list, max_length=MAX_TASTE_TAGS)
    course: list[str] = Field(default_factory=list, max_length=MAX_COURSE_TAGS)
    reel_moment: str
    texture: list[str] = Field(default_factory=list, max_length=MAX_TEXTURE_TAGS)
    prep_style: list[str] = Field(default_factory=list, max_length=MAX_PREP_STYLE_TAGS)
    occasion: list[str] = Field(default_factory=list, max_length=MAX_OCCASION_TAGS)
    serve_temp: str
    content_angle: list[str] = Field(default_factory=list, max_length=MAX_CONTENT_ANGLE_TAGS)


class MenuTaggerItemDraft(BaseModel):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    tags: MenuTaggerTagsDraft


class MenuTaggerDraftOutput(BaseModel):
    items: list[MenuTaggerItemDraft]


async def fetch_and_prepare(state: MenuTaggerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client
    _trace(state, "execute_skill", skill_id="menu_tagger")

    prior_json = str(state.get("prior_milestones_data") or "")
    promotion_row = extract_promotion_candidates_row(prior_json)
    promotion_data = extract_promotion_candidates_data(prior_json)
    if promotion_data is None:
        raise ValueError(
            "menu_tagger requires a prior promotion_candidates milestone with saved data"
        )

    input_items = flatten_promotion_candidates_items(promotion_data)
    if not input_items:
        raise ValueError(
            "menu_tagger requires at least one star or puzzle item in prior promotion_candidates data"
        )

    owner_notes_markdown = _fmt_owner_notes(state)
    generation_context_markdown = _build_generation_context(
        state=state,
        owner_notes_markdown=owner_notes_markdown,
        promotion_candidates_data=promotion_data,
        input_items=input_items,
    )

    source_title = ""
    if isinstance(promotion_row, dict):
        title = promotion_row.get("title")
        if isinstance(title, str) and title.strip():
            source_title = title.strip()

    return {
        "owner_notes_markdown": owner_notes_markdown,
        "generation_context_markdown": generation_context_markdown,
        "source_promotion_candidates_title": source_title,
        "input_items": input_items,
    }


def _build_output(
    *,
    items: list[MenuTaggerItem],
    source_title: str,
    notes: str = "",
) -> MenuTaggerOutput:
    payload: MenuTaggerOutput = {
        "taxonomyVersion": TAXONOMY_VERSION,
        "items": items,
        "usedTags": compute_used_tags(items),
    }
    if source_title.strip():
        payload["sourcePromotionCandidatesTitle"] = source_title.strip()
    if notes.strip():
        payload["notes"] = notes.strip()
    return payload


def _sanitize_menu_tagger_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Re-normalize item tags and recompute usedTags so persisted data matches fixed enums."""
    items_raw = payload.get("items")
    if not isinstance(items_raw, list):
        return payload

    sanitized_items: list[MenuTaggerItem] = []
    for item in items_raw:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        role = str(item.get("role") or "").strip()
        category = str(item.get("category") or "").strip() or "(uncategorized)"
        if not name or role not in ("star", "puzzle"):
            continue
        tags_raw = item.get("tags")
        sanitized_items.append(
            {
                "name": name,
                "role": role,  # type: ignore[typeddict-item]
                "category": category,
                "tags": normalize_menu_tagger_tags(tags_raw if isinstance(tags_raw, dict) else None),
            }
        )

    sanitized: dict[str, Any] = {
        **payload,
        "taxonomyVersion": TAXONOMY_VERSION,
        "items": sanitized_items,
        "usedTags": compute_used_tags(sanitized_items),
    }
    return sanitized


def _normalize_generated_output(payload: Any) -> MenuTaggerOutput:
    if not isinstance(payload, dict):
        raise ValueError("menu_tagger output validation failed")
    sanitized = _sanitize_menu_tagger_payload(payload)
    normalized, error = validate_skill_output("menu_tagger", sanitized)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "menu_tagger output validation failed")
    return normalized  # type: ignore[return-value]


async def tag_items(state: MenuTaggerState) -> dict[str, Any]:
    input_items = state.get("input_items") or []
    if not input_items:
        raise ValueError("menu_tagger has no input items to tag")

    llm = structured_llm_from_milestone_run_config().with_structured_output(MenuTaggerDraftOutput)
    _trace_agent_event(state, "chat_model_start")
    generated = await llm.ainvoke(
        [
            SystemMessage(content=MENU_TAGGER_SYSTEM),
            HumanMessage(content=str(state.get("generation_context_markdown") or "").strip()),
        ]
    )
    _trace_agent_event(state, "chat_model_end")

    llm_items = [row.model_dump() for row in generated.items]
    merged = merge_tagged_items(input_items, llm_items)
    source_title = str(state.get("source_promotion_candidates_title") or "")
    owner_notes = ""
    owner_md = str(state.get("owner_notes_markdown") or "").strip()
    if owner_md:
        owner_notes = owner_md.split("\n\n", 2)[-1].strip() if "\n\n" in owner_md else ""

    generated_output = _build_output(
        items=merged,
        source_title=source_title,
        notes=owner_notes,
    )
    normalized = _normalize_generated_output(generated_output)
    return {"generated_output": normalized}


async def persist_result(state: MenuTaggerState, *, client: httpx.AsyncClient) -> dict[str, Any]:
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
