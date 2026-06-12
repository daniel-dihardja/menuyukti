"""Nodes for promotion-candidates assembly, storytelling enrichment, and persistence."""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_promotion_engineering_candidates,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
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


def _parse_engineering_items(raw: Any) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in raw:
        name = ""
        quantity: int | None = None
        popularity: float | None = None
        price_level: int | None = None
        if isinstance(item, str):
            name = item.strip()
        elif isinstance(item, dict):
            name = str(item.get("menu") or item.get("name") or "").strip()
            quantity_raw = item.get("quantity")
            popularity_raw = item.get("popularity")
            price_level_raw = item.get("price_level", item.get("priceLevel"))
            if quantity_raw is not None and quantity_raw != "":
                quantity = int(quantity_raw)
            if popularity_raw is not None and popularity_raw != "":
                popularity = float(popularity_raw)
            if price_level_raw in (1, 2, 3):
                price_level = int(price_level_raw)
        if not name:
            continue
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(
            _placeholder_item(
                name,
                quantity=quantity,
                popularity=popularity,
                price_level=price_level,
            )
        )
    return out


def _placeholder_item(
    name: str,
    *,
    quantity: int | None = None,
    popularity: float | None = None,
    price_level: int | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "name": name,
        "storytellingFit": "weak",
        "storytellingRationale": "",
    }
    if quantity is not None:
        item["quantity"] = quantity
    if popularity is not None:
        item["popularity"] = popularity
    if price_level in (1, 2, 3):
        item["priceLevel"] = price_level
    return item


def _extract_main_category(prior_milestones_data: str) -> str:
    text = prior_milestones_data.strip()
    if not text:
        return "(uncategorized)"
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return "(uncategorized)"
    if not isinstance(payload, list):
        return "(uncategorized)"

    for row in payload:
        if not isinstance(row, dict):
            continue
        preset_id = str(row.get("presetId") or "").strip()
        if preset_id != "restaurant_campaign_brief":
            continue
        data = row.get("data")
        if not isinstance(data, dict):
            continue
        value = str(data.get("mainCategory") or "").strip()
        if value:
            return value
    return "(uncategorized)"


def _category_matches_main_focus(category: str, main_category: str) -> bool:
    focus = main_category.strip()
    if not focus:
        return False
    return category.strip().casefold() == focus.casefold()


def _sort_category_blocks(
    blocks: list[dict[str, Any]],
    main_category: str,
) -> list[dict[str, Any]]:
    return sorted(
        blocks,
        key=lambda block: (
            0
            if _category_matches_main_focus(str(block.get("category") or ""), main_category)
            else 1,
            str(block.get("category") or "").casefold(),
        ),
    )


def _read_milestone_input_value(milestone_input: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(milestone_input, dict):
        return {}
    value = milestone_input.get("value")
    return value if isinstance(value, dict) else {}


def _read_milestone_input_notes(milestone_input: dict[str, Any] | None) -> str:
    return str(_read_milestone_input_value(milestone_input).get("notes") or "").strip()


def _read_selected_menu_categories(milestone_input: dict[str, Any] | None) -> set[str] | None:
    """Return None when empty/absent (= include all POS menu categories)."""
    raw = _read_milestone_input_value(milestone_input).get("selectedMenuCategories")
    if not isinstance(raw, list) or not raw:
        return None
    out: set[str] = set()
    for item in raw:
        text = str(item or "").strip()
        if text:
            out.add(text)
    return out if out else None


def _read_item_limit(
    milestone_input: dict[str, Any] | None,
    key: str,
    default: int,
) -> int:
    """Map milestone input limit to GraphQL max count; 0 means unlimited."""
    raw = _read_milestone_input_value(milestone_input).get(key)
    if raw == "all":
        return 0
    if raw in (5, 10):
        return int(raw)
    if isinstance(raw, int) and raw in (5, 10):
        return raw
    return default


def _category_in_selected(category: str, selected: set[str]) -> bool:
    key = category.strip()
    if not key:
        return False
    selected_cf = {s.casefold() for s in selected}
    return key in selected or key.casefold() in selected_cf


def _filter_promotion_candidates(
    promotion_candidates: dict[str, Any] | None,
    selected: set[str] | None,
) -> dict[str, Any] | None:
    if promotion_candidates is None or selected is None:
        return promotion_candidates
    grouping = str(promotion_candidates.get("grouping") or "").strip()
    if grouping != "by_menu_category":
        return promotion_candidates
    raw_categories = promotion_candidates.get("categories")
    if not isinstance(raw_categories, dict):
        return promotion_candidates
    filtered = {
        str(key): bucket
        for key, bucket in raw_categories.items()
        if _category_in_selected(str(key), selected)
    }
    return {**promotion_candidates, "categories": filtered}


def _read_ignored_menu_items(milestone_input: dict[str, Any] | None) -> set[str]:
    raw = _read_milestone_input_value(milestone_input).get("ignoredMenuItems")
    if not isinstance(raw, list) or not raw:
        return set()
    out: set[str] = set()
    for item in raw:
        text = str(item or "").strip()
        if text:
            out.add(text.casefold())
    return out


def _engineering_item_name(item: Any) -> str:
    if isinstance(item, str):
        return item.strip()
    if isinstance(item, dict):
        return str(item.get("menu") or item.get("name") or "").strip()
    return ""


def _filter_bucket_items(items: Any, ignored: set[str]) -> list[Any]:
    if not isinstance(items, list) or not ignored:
        return items if isinstance(items, list) else []
    return [item for item in items if _engineering_item_name(item).casefold() not in ignored]


def _filter_ignored_menu_items(
    promotion_candidates: dict[str, Any] | None,
    ignored: set[str],
) -> dict[str, Any] | None:
    if promotion_candidates is None or not ignored:
        return promotion_candidates
    grouping = str(promotion_candidates.get("grouping") or "").strip()
    if grouping == "by_menu_category":
        raw_categories = promotion_candidates.get("categories")
        if not isinstance(raw_categories, dict):
            return promotion_candidates
        filtered_categories: dict[str, Any] = {}
        for key, bucket in raw_categories.items():
            if not isinstance(bucket, dict):
                continue
            filtered_bucket = {
                "starItems": _filter_bucket_items(bucket.get("starItems"), ignored),
                "puzzleItems": _filter_bucket_items(bucket.get("puzzleItems"), ignored),
            }
            if filtered_bucket["starItems"] or filtered_bucket["puzzleItems"]:
                filtered_categories[str(key)] = filtered_bucket
        return {**promotion_candidates, "categories": filtered_categories}

    return {
        **promotion_candidates,
        "starItems": _filter_bucket_items(promotion_candidates.get("starItems"), ignored),
        "puzzleItems": _filter_bucket_items(promotion_candidates.get("puzzleItems"), ignored),
    }


def _build_output(
    *,
    main_category: str,
    promotion_candidates: dict[str, Any] | None,
    owner_notes: str = "",
    selected_categories: set[str] | None = None,
    source_analytics_run_id: str | None = None,
) -> PromotionCandidatesOutput:
    categories_out: list[dict[str, Any]] = []
    notes_parts: list[str] = []
    if owner_notes.strip():
        notes_parts.append(owner_notes.strip())

    if isinstance(promotion_candidates, dict):
        grouping = str(promotion_candidates.get("grouping") or "").strip()
        if grouping == "by_menu_category":
            raw_categories = promotion_candidates.get("categories")
            if isinstance(raw_categories, dict):
                for raw_key in sorted(raw_categories.keys(), key=lambda k: str(k).casefold()):
                    key = str(raw_key or "").strip()
                    if not key:
                        continue
                    raw_bucket = raw_categories[raw_key]
                    if not isinstance(raw_bucket, dict):
                        continue
                    categories_out.append(
                        {
                            "category": key,
                            "starItems": _parse_engineering_items(raw_bucket.get("starItems")),
                            "puzzleItems": _parse_engineering_items(raw_bucket.get("puzzleItems")),
                        }
                    )
        else:
            categories_out.append(
                {
                    "category": "All items",
                    "starItems": _parse_engineering_items(promotion_candidates.get("starItems")),
                    "puzzleItems": _parse_engineering_items(
                        promotion_candidates.get("puzzleItems")
                    ),
                }
            )
            if selected_categories is not None:
                notes_parts.append(
                    "Menu category filter was not applied because analytics returned a flat "
                    "grouping (no POS categories on order lines)."
                )

    if not categories_out:
        categories_out = [{"category": "All items", "starItems": [], "puzzleItems": []}]

    categories_out = _sort_category_blocks(categories_out, main_category)

    if not any(block.get("starItems") or block.get("puzzleItems") for block in categories_out):
        notes_parts.append("No promotion candidates were returned from analytics.")

    return {
        "mainCategory": main_category,
        "categories": categories_out,
        "sourceAnalyticsRunId": source_analytics_run_id,
        "notes": "\n\n".join(notes_parts),
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
        cat = str(block.get("category") or "").strip()
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
    name: str = Field(
        default="",
        description="Menu display name matching the input list. If omitted, it will be aligned by order.",
    )
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


def _verdict_map_from_llm(
    lines: list[StorytellingVerdictLine],
    *,
    unique_names: list[str],
) -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    for index, line in enumerate(lines):
        name = str(line.name or "").strip()
        if not name and index < len(unique_names):
            name = unique_names[index]
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
                quantity: int | None = None
                popularity: float | None = None
                price_level: int | None = None
                if isinstance(raw, str):
                    name = raw.strip()
                elif isinstance(raw, dict):
                    name = str(raw.get("name") or "").strip()
                    quantity_raw = raw.get("quantity")
                    popularity_raw = raw.get("popularity")
                    price_level_raw = raw.get("priceLevel", raw.get("price_level"))
                    if quantity_raw is not None and quantity_raw != "":
                        quantity = int(quantity_raw)
                    if popularity_raw is not None and popularity_raw != "":
                        popularity = float(popularity_raw)
                    if price_level_raw in (1, 2, 3):
                        price_level = int(price_level_raw)
                if not name:
                    continue
                fit, rationale = by_cf.get(name.casefold(), _DEFAULT_MISSING_VERDICT)
                item: dict[str, Any] = {
                    "name": name,
                    "storytellingFit": fit,
                    "storytellingRationale": rationale,
                }
                if quantity is not None:
                    item["quantity"] = quantity
                if popularity is not None:
                    item["popularity"] = popularity
                if price_level in (1, 2, 3):
                    item["priceLevel"] = price_level
                new_items.append(item)
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
    milestone_input = state.get("milestone_input")
    milestone_input_dict = milestone_input if isinstance(milestone_input, dict) else None
    selected = _read_selected_menu_categories(milestone_input_dict)
    ignored = _read_ignored_menu_items(milestone_input_dict)
    max_star_items = _read_item_limit(milestone_input_dict, "starItemLimit", 5)
    max_puzzle_items = _read_item_limit(milestone_input_dict, "puzzleItemLimit", 10)
    fetch_result = await fetch_promotion_engineering_candidates(
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
        max_star_items=max_star_items,
        max_puzzle_items=max_puzzle_items,
    )
    promotion_candidates = fetch_result["candidates"]
    analytics_run_id = fetch_result["analyticsRunId"]
    filtered = _filter_promotion_candidates(promotion_candidates, selected)
    filtered = _filter_ignored_menu_items(filtered, ignored)
    owner_notes = _read_milestone_input_notes(milestone_input_dict)
    main_category = _extract_main_category(str(state.get("prior_milestones_data") or ""))
    formatted = _build_output(
        main_category=main_category,
        promotion_candidates=filtered,
        owner_notes=owner_notes,
        selected_categories=selected,
        source_analytics_run_id=analytics_run_id,
    )
    return {
        "promotion_candidates": filtered,
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
    milestone_input = state.get("milestone_input")
    owner_notes = _read_milestone_input_notes(
        milestone_input if isinstance(milestone_input, dict) else None
    )
    selected = _read_selected_menu_categories(
        milestone_input if isinstance(milestone_input, dict) else None
    )
    ignored = _read_ignored_menu_items(
        milestone_input if isinstance(milestone_input, dict) else None
    )

    human_sections = [
        f"## Milestone goal\n{goal}",
        f"## Milestone criteria\n```json\n{criteria_json}\n```",
        injected,
    ]
    if owner_notes:
        human_sections.append(f"## Owner notes (milestone input)\n{owner_notes}")
    if selected is not None:
        human_sections.append(
            "## Selected menu categories (milestone input)\n```json\n"
            + json.dumps({"selectedMenuCategories": sorted(selected)}, ensure_ascii=False, indent=2)
            + "\n```"
        )
    if ignored:
        ignored_display = sorted(
            str(item or "").strip()
            for item in (
                _read_milestone_input_value(
                    milestone_input if isinstance(milestone_input, dict) else None
                ).get("ignoredMenuItems")
                or []
            )
            if str(item or "").strip()
        )
        human_sections.append(
            "## Ignored menu items (milestone input)\n```json\n"
            + json.dumps({"ignoredMenuItems": ignored_display}, ensure_ascii=False, indent=2)
            + "\n```"
        )
    star_limit = _read_item_limit(
        milestone_input if isinstance(milestone_input, dict) else None,
        "starItemLimit",
        5,
    )
    puzzle_limit = _read_item_limit(
        milestone_input if isinstance(milestone_input, dict) else None,
        "puzzleItemLimit",
        10,
    )
    human_sections.append(
        "## Item limits per category (milestone input)\n```json\n"
        + json.dumps(
            {
                "starItemLimit": "all" if star_limit == 0 else star_limit,
                "puzzleItemLimit": "all" if puzzle_limit == 0 else puzzle_limit,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n```"
    )
    human_sections.extend(
        [
            "## Menu candidate names (distinct)\n```json\n"
            + json.dumps({"menuNames": unique_names}, ensure_ascii=False, indent=2)
            + "\n```",
            "## Menu candidate placements (category and star vs puzzle)\n```json\n"
            + json.dumps({"menuRefs": menu_refs}, ensure_ascii=False, indent=2)
            + "\n```",
            "Return exactly one verdict per name in `menuNames` (same spelling). "
            'Use `storytellingFit` "strong" or "weak" and a short `storytellingRationale`.',
        ]
    )
    human_message = "\n\n".join(human_sections)

    _trace_agent_event(state, "chat_model_start")
    try:
        generated = await structured_ainvoke_from_run_config(
            StorytellingVerdictsOutput,
            [
                SystemMessage(content=PROMOTION_STORYTELLING_SYSTEM),
                HumanMessage(content=human_message),
            ],
        )
    except LLMInvokeError as exc:
        emit_llm_error_step(exc.code, str(exc))
        raise ValueError(str(exc)) from exc
    _trace_agent_event(state, "chat_model_end")

    by_cf = _verdict_map_from_llm(generated.verdicts, unique_names=unique_names)
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
