"""Nodes for deterministic promotion-candidates assembly and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_promotion_engineering_candidates,
    upsert_milestonedata_node,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.promotion_candidates.state import (
    PromotionCandidatesOutput,
    PromotionCandidatesState,
)
from langgraph.config import get_stream_writer

_VALID_MAIN_CATEGORIES = ("FOOD", "DRINK")


def _trace(state: PromotionCandidatesState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
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
            # Flat payload has no category split; keep the shape stable by assigning to FOOD.
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
                "starItems": categories_map[category]["starItems"],
                "puzzleItems": categories_map[category]["puzzleItems"],
            }
            for category in ordered_categories
        ],
        "sourceAnalyticsRunId": None,
        "notes": notes,
    }


async def fetch_and_prepare(
    state: PromotionCandidatesState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Fetch promotion candidates and combine with campaign brief main category."""
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
