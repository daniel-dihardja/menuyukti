"""Nodes for dedicated promotion-candidates generation and persistence."""

from __future__ import annotations

import json
from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.promotion_candidates.prompts import (
    PROMOTION_CANDIDATES_SYSTEM,
)
from agents_app.agents.core.milestone_run.promotion_candidates.state import (
    PromotionCandidatesOutput,
    PromotionCandidatesState,
)
from agents_app.agents.core.milestone_run.tools.get_promotion_candidates import (
    _fmt_milestone_promotion_candidates_owner_notes,
)
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    ANALYTICS_RUNS_QUERY,
    PROMOTION_ENGINEERING_CANDIDATES_QUERY,
)
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field

_JSON_SEPARATORS = (",", ":")


class PromotionCandidatesCategoryDraft(BaseModel):
    menuCategory: str
    starHighlights: list[str] = Field(default_factory=list)
    puzzleHighlights: list[str] = Field(default_factory=list)
    notes: str | None = None


class PromotionCandidatesDraftOutput(BaseModel):
    grouping: Literal["by_menu_category", "flat"]
    categories: list[PromotionCandidatesCategoryDraft] = Field(default_factory=list)
    flatSummary: str = ""
    promotionIdeas: list[str] = Field(default_factory=list)


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


def _json_block(title: str, payload: Any) -> str:
    encoded = json.dumps(payload, ensure_ascii=False, indent=2)
    return f"## {title}\n```json\n{encoded}\n```"


def _build_generation_context(
    *,
    state: PromotionCandidatesState,
    analytics_run: dict[str, Any] | None,
    promotion_candidates_raw: dict[str, Any] | None,
    owner_notes_markdown: str,
) -> str:
    sections: list[str] = []
    sections.append(f"## Milestone goal\n{str(state.get('goal') or '').strip() or '_No goal provided._'}")
    sections.append(_json_block("Milestone criteria", state.get("criteria") or []))
    if analytics_run is not None:
        sections.append(_json_block("Analytics run", analytics_run))
    else:
        sections.append("## Analytics run\n_No analytics run found for this location._")
    if promotion_candidates_raw is not None:
        sections.append(_json_block("Promotion engineering candidates", promotion_candidates_raw))
    else:
        sections.append(
            "## Promotion engineering candidates\n_Unavailable for latest analytics run._"
        )
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if injected:
        sections.append(injected)
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


def _fallback_output() -> PromotionCandidatesOutput:
    return {
        "grouping": "flat",
        "categories": {},
        "flatSummary": (
            "Promotion engineering candidates are unavailable because no analytics run data "
            "was found for this location."
        ),
        "promotionIdeas": [],
    }


async def fetch_and_prepare(
    state: PromotionCandidatesState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Fetch analytics + promotion candidates and normalize generation context markdown."""
    _trace(state, "execute_skill", skill_id="promotion_candidates")
    runs_data = await graphql_post(
        client,
        ANALYTICS_RUNS_QUERY,
        {"locationId": int(state["location_id"]), "first": 1},
        str(state["user_id"]),
    )
    runs = runs_data.get("analyticsRuns")
    run = runs[0] if isinstance(runs, list) and runs else None
    run_id = str(run.get("id", "")).strip() if isinstance(run, dict) else ""
    analytics_run = {"id": run.get("id"), "name": run.get("name")} if isinstance(run, dict) else None
    promotion_raw: dict[str, Any] | None = None
    if run_id:
        pec_data = await graphql_post(
            client,
            PROMOTION_ENGINEERING_CANDIDATES_QUERY,
            {"locationId": str(state["location_id"]), "analyticsRunId": run_id},
            str(state["user_id"]),
        )
        raw = pec_data.get("promotionEngineeringCandidates")
        promotion_raw = raw if isinstance(raw, dict) else None
    owner_notes_markdown = _fmt_milestone_promotion_candidates_owner_notes(
        {"milestone_input": state.get("milestone_input")}
    )
    generation_context = _build_generation_context(
        state=state,
        analytics_run=analytics_run,
        promotion_candidates_raw=promotion_raw,
        owner_notes_markdown=owner_notes_markdown,
    )
    return {
        "analytics_run": analytics_run,
        "promotion_candidates_raw": promotion_raw,
        "owner_notes_markdown": owner_notes_markdown,
        "generation_context_markdown": generation_context,
    }


async def generate_draft(state: PromotionCandidatesState) -> dict[str, Any]:
    """Generate structured promotion-candidates output; fallback deterministically when missing analytics."""
    if not isinstance(state.get("analytics_run"), dict) or not isinstance(
        state.get("promotion_candidates_raw"), dict
    ):
        return {"generated_output": _fallback_output()}
    _trace_agent_event(state, "chat_model_start")
    llm = get_llm_structured().with_structured_output(PromotionCandidatesDraftOutput)
    generated = await llm.ainvoke(
        [
            SystemMessage(content=PROMOTION_CANDIDATES_SYSTEM),
            HumanMessage(content=str(state.get("generation_context_markdown", ""))),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    return {"generated_output": generated.model_dump(exclude_none=True)}


def _normalize_generated_output(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return _fallback_output()
    grouping = str(payload.get("grouping") or "flat").strip()
    if grouping not in {"by_menu_category", "flat"}:
        grouping = "flat"
    categories_raw = payload.get("categories")
    categories: dict[str, dict[str, Any]] = {}
    if grouping == "by_menu_category" and isinstance(categories_raw, list):
        for value in categories_raw:
            if not isinstance(value, dict):
                continue
            category_key = str(value.get("menuCategory") or "").strip()
            if not category_key:
                continue
            categories[category_key] = {
                "menuCategory": str(value.get("menuCategory") or category_key).strip(),
                "starHighlights": [str(x).strip() for x in value.get("starHighlights", []) if str(x).strip()],
                "puzzleHighlights": [
                    str(x).strip() for x in value.get("puzzleHighlights", []) if str(x).strip()
                ],
            }
            notes = value.get("notes")
            if isinstance(notes, str) and notes.strip():
                categories[category_key]["notes"] = notes.strip()
    flat_summary = str(payload.get("flatSummary") or "").strip()
    ideas = [str(x).strip() for x in payload.get("promotionIdeas", []) if str(x).strip()]
    seen: set[str] = set()
    deduped_ideas: list[str] = []
    for idea in ideas:
        key = idea.casefold()
        if key in seen:
            continue
        seen.add(key)
        deduped_ideas.append(idea)
    return {
        "grouping": grouping,
        "categories": categories if grouping == "by_menu_category" else {},
        "flatSummary": flat_summary,
        "promotionIdeas": deduped_ideas,
    }


async def persist_result(
    state: PromotionCandidatesState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Validate/coerce and persist promotion-candidates payload via milestone data upsert."""
    payload = _normalize_generated_output(state.get("generated_output"))
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
    result_data = json.dumps(normalized, ensure_ascii=False, indent=2, separators=_JSON_SEPARATORS)
    return {
        "result_data": result_data,
        "milestone_data": normalized,
        "milestonedata_written": True,
        "raw_data": result_data,
    }
