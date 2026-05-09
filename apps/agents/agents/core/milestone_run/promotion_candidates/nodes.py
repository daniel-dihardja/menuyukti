"""Nodes for promotion-candidates assembly, storytelling enrichment, and persistence."""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_promotion_engineering_candidates,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_llm_from_milestone_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.promotion_candidates.prompts import (
    PROMOTION_STORYTELLING_SYSTEM,
)
from agents_app.agents.core.milestone_run.promotion_candidates.state import (
    PromotionCandidatesOutput,
    PromotionCandidatesState,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

_DEFAULT_MISSING_VERDICT = (
    "weak",
    "The model did not return a verdict for this menu name.",
)


def _trace(state: PromotionCandidatesState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: PromotionCandidatesState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _norm_items(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        text = str(item or "").strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(text)
    return out


def _placeholder_item(name: str) -> dict[str, Any]:
    return {
        "name": name,
        "storytellingFit": "weak",
        "storytellingRationale": "",
    }


def _extract_main_category(prior_milestones_data: str) -> str:
    text = prior_milestones_data.strip()
    if not text:
        return "FOOD"
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return "FOOD"
    if not isinstance(payload, list):
        return "FOOD"

    _VALID_MAIN_CATEGORIES = ("FOOD", "DRINK")
    for row in payload:
        if not isinstance(row, dict):
            continue
        preset_id = str(row.get("presetId") or "").strip()
        if preset_id != "restaurant_campaign_brief":
            continue
        data = row.get("data")
        if not isinstance(data, dict):
            continue
        value = str(data.get("mainCategory") or "").strip().upper()
        if value in _VALID_MAIN_CATEGORIES:
            return value
    return "FOOD"


def _build_output(
    *,
    main_category: str,
    promotion_candidates: dict[str, Any] | None,
) -> PromotionCandidatesOutput:
    _VALID_MAIN_CATEGORIES = ("FOOD", "DRINK")
    categories_map: dict[str, dict[str, list[str]]] = {
        "FOOD": {"starItems": [], "puzzleItems": []},
        "DRINK": {"starItems": [], "puzzleItems": []},
    }
    notes = ""

    if isinstance(promotion_candidates, dict):
        grouping = str(promotion_candidates.get("grouping") or "").strip()
        if grouping == "by_menu_category":
            raw_categories = promotion_candidates.get("categories")
            if isinstance(raw_categories, dict):
                for raw_key, raw_bucket in raw_categories.items():
                    key = str(raw_key or "").strip().upper()
                    if key not in categories_map or not isinstance(raw_bucket, dict):
                        continue
                    categories_map[key]["starItems"] = _norm_items(raw_bucket.get("starItems"))
                    categories_map[key]["puzzleItems"] = _norm_items(raw_bucket.get("puzzleItems"))
        else:
            categories_map["FOOD"]["starItems"] = _norm_items(promotion_candidates.get("starItems"))
            categories_map["FOOD"]["puzzleItems"] = _norm_items(
                promotion_candidates.get("puzzleItems")
            )

    if not any(categories_map[c]["starItems"] or categories_map[c]["puzzleItems"] for c in categories_map):
        notes = "No promotion candidates were returned from analytics."

    ordered_categories = [main_category] + [c for c in _VALID_MAIN_CATEGORIES if c != main_category]
    return {
        "mainCategory": main_category,
        "categories": [
            {
                "category": category,
                "starItems": [_placeholder_item(n) for n in categories_map[category]["starItems"]],
                "puzzleItems": [_placeholder_item(n) for n in categories_map[category]["puzzleItems"]],
            }
            for category in ordered_categories
        ],
        "sourceAnalyticsRunId": None,
        "notes": notes,
    }


def _collect_unique_names(formatted: dict[str, Any]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    categories = formatted.get("categories")
    if not isinstance(categories, list):
        return ordered
    for block in categories:
        if not isinstance(block, dict):
            continue
        for key in ("starItems", "puzzleItems"):
            raw_items = block.get(key)
            if not isinstance(raw_items, list):
                continue
            for raw in raw_items:
                name = ""
                if isinstance(raw, str):
                    name = raw.strip()
                elif isinstance(raw, dict):
                    name = str(raw.get("name") or "").strip()
                if not name:
                    continue
                cf = name.casefold()
                if cf in seen:
                    continue
                seen.add(cf)
                ordered.append(name)
    return ordered


def _collect_menu_refs(formatted: dict[str, Any]) -> list[dict[str, str]]:
    refs: list[dict[str, str]] = []
    categories = formatted.get("categories")
    if not isinstance(categories, list):
        return refs
    for block in categories:
        if not isinstance(block, dict):
            continue
        cat = str(block.get("category") or "").strip().upper()
        for role in ("star", "puzzle"):
            key = "starItems" if role == "star" else "puzzleItems"
            raw_items = block.get(key)
            if not isinstance(raw_items, list):
                continue
            for raw in raw_items:
                name = ""
                if isinstance(raw, str):
                    name = raw.strip()
                elif isinstance(raw, dict):
                    name = str(raw.get("name") or "").strip()
                if not name:
                    continue
                refs.append({"category": cat, "role": role, "name": name})
    return refs


class StorytellingVerdictLine(BaseModel):
    name: str = Field(description="Menu display name matching the input list.")
    storytellingFit: Literal["strong", "weak"] = Field(
        description='Whether the name supports Instagram storytelling for this campaign ("strong" or "weak").'
    )
    storytellingRationale: str = Field(
        description="One or two sentences, grounded in the brief and the name."
    )


class StorytellingVerdictsOutput(BaseModel):
    verdicts: list[StorytellingVerdictLine] = Field(
        description="One verdict per distinct menu name from the input list."
    )


def _verdict_map_from_llm(lines: list[StorytellingVerdictLine]) -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    for line in lines:
        name = str(line.name or "").strip()
        if not name:
            continue
        fit = line.storytellingFit if line.storytellingFit in ("strong", "weak") else "weak"
        rationale = str(line.storytellingRationale or "").strip()
        if len(rationale) > 600:
            rationale = rationale[:597].rstrip() + "..."
        out[name.casefold()] = (fit, rationale)
    return out


def _apply_verdicts_to_formatted(
    formatted: dict[str, Any],
    by_cf: dict[str, tuple[str, str]],
) -> dict[str, Any]:
    merged = deepcopy(formatted)
    categories = merged.get("categories")
    if not isinstance(categories, list):
        return merged
    for block in categories:
        if not isinstance(block, dict):
            continue
        for key in ("starItems", "puzzleItems"):
            raw_items = block.get(key)
            if not isinstance(raw_items, list):
                continue
            new_items: list[dict[str, Any]] = []
            for raw in raw_items:
                name = ""
                if isinstance(raw, str):
                    name = raw.strip()
                elif isinstance(raw, dict):
                    name = str(raw.get("name") or "").strip()
                if not name:
                    continue
                fit, rationale = by_cf.get(name.casefold(), _DEFAULT_MISSING_VERDICT)
                new_items.append(
                    {
                        "name": name,
                        "storytellingFit": fit,
                        "storytellingRationale": rationale,
                    }
                )
            block[key] = new_items
    return merged


async def fetch_and_prepare(
    state: PromotionCandidatesState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Fetch promotion candidates, require campaign brief context, and build category buckets."""
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if not injected:
        raise ValueError(
            "promotion_candidates requires a prior restaurant_campaign_brief milestone "
            "with saved data so storytelling can use the campaign brief as context."
        )

    _trace(state, "execute_skill", skill_id="promotion_candidates")
    promotion_candidates = await fetch_promotion_engineering_candidates(
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
    )
    main_category = _extract_main_category(str(state.get("prior_milestones_data") or ""))
    formatted = _build_output(
        main_category=main_category,
        promotion_candidates=promotion_candidates,
    )
    return {
        "promotion_candidates": promotion_candidates,
        "campaign_brief_main_category": main_category,
        "formatted_output": formatted,
    }


async def enrich_storytelling(state: PromotionCandidatesState) -> dict[str, Any]:
    """Score menu names for campaign-brief storytelling via one structured LLM call."""
    formatted = state.get("formatted_output")
    if not isinstance(formatted, dict):
        return {}

    unique_names = _collect_unique_names(formatted)
    if not unique_names:
        _trace(state, "enrich_storytelling_skipped", reason="no_menu_names")
        return {"formatted_output": formatted}

    menu_refs = _collect_menu_refs(formatted)
    goal = str(state.get("goal") or "").strip() or "_No goal provided._"
    criteria_json = json.dumps(state.get("criteria") or [], ensure_ascii=False, indent=2)
    injected = str(state.get("injected_prior_context_markdown") or "").strip()

    human_sections = [
        f"## Milestone goal\n{goal}",
        f"## Milestone criteria\n```json\n{criteria_json}\n```",
        injected,
        "## Menu candidate names (distinct)\n```json\n"
        + json.dumps({"menuNames": unique_names}, ensure_ascii=False, indent=2)
        + "\n```",
        "## Menu candidate placements (category and star vs puzzle)\n```json\n"
        + json.dumps({"menuRefs": menu_refs}, ensure_ascii=False, indent=2)
        + "\n```",
        "Return exactly one verdict per name in `menuNames` (same spelling). "
        "Use `storytellingFit` \"strong\" or \"weak\" and a short `storytellingRationale`.",
    ]
    human_message = "\n\n".join(human_sections)

    llm = structured_llm_from_milestone_run_config().with_structured_output(StorytellingVerdictsOutput)
    _trace_agent_event(state, "chat_model_start")
    generated = await llm.ainvoke(
        [
            SystemMessage(content=PROMOTION_STORYTELLING_SYSTEM),
            HumanMessage(content=human_message),
        ]
    )
    _trace_agent_event(state, "chat_model_end")

    by_cf = _verdict_map_from_llm(generated.verdicts)
    merged = _apply_verdicts_to_formatted(formatted, by_cf)
    return {"formatted_output": merged}


async def persist_result(
    state: PromotionCandidatesState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Validate/coerce and persist promotion-candidates payload."""
    payload = state.get("formatted_output")
    normalized, error = validate_skill_output("promotion_candidates", payload)
    if error is not None or normalized is None:
        raise ValueError(error or "promotion_candidates output validation failed")
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
