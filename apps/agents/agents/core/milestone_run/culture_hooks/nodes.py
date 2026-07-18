"""Nodes for dedicated culture-hooks generation and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.culture_hooks.prompts import CULTURE_HOOKS_SYSTEM
from agents_app.agents.core.milestone_run.culture_hooks.state import (
    CultureHooksOutput,
    CultureHooksState,
)
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.prior_context_inject import (
    extract_restaurant_campaign_brief_data,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel


def _trace(state: CultureHooksState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: CultureHooksState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: CultureHooksState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "culture_hooks":
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
        "_Optional owner guidance. Treat these notes as tone/direction hints, not as verified facts._\n\n"
        f"{text}"
    )


def _build_generation_context(
    state: CultureHooksState,
    owner_notes_markdown: str,
    *,
    web_research_markdown: str = "",
) -> str:
    goal = str(state.get("goal") or "").strip() or "_No goal provided._"
    criteria = state.get("criteria") or []
    criteria_json = json.dumps(criteria, ensure_ascii=False, indent=2)
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if not injected:
        raise ValueError("culture_hooks requires a prior restaurant_campaign_brief milestone")

    sections: list[str] = [
        f"## Milestone goal\n{goal}",
        f"## Milestone criteria\n```json\n{criteria_json}\n```",
        injected,
    ]
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    research = web_research_markdown.strip()
    if research:
        sections.append(research)
    return "\n\n".join(sections)


def _first_non_empty_str(values: object) -> str:
    if not isinstance(values, list):
        return ""
    for raw in values:
        text = str(raw).strip()
        if text:
            return text
    return ""


def _origin_culture_keyword(brief: dict[str, Any]) -> str:
    """Derive heritage/origin culture label from campaign brief fields."""
    main_category = str(brief.get("mainCategory") or "").strip()
    if main_category:
        return " ".join(main_category.split()[:4])

    for key in ("messageHierarchy", "proofOrientedAngles", "contentPillars"):
        candidate = _first_non_empty_str(brief.get(key))
        if candidate:
            return " ".join(candidate.split()[:4])

    overall = brief.get("overallStrategy")
    if isinstance(overall, dict):
        focus = str(overall.get("strategyFocus") or overall.get("coreMessage") or "").strip()
        if focus:
            return " ".join(focus.split()[:4])
    return ""


def _culture_hooks_search_queries(brief: dict[str, Any]) -> list[str]:
    venue = brief.get("venueSnapshot")
    city = ""
    country = ""
    if isinstance(venue, dict):
        city = str(venue.get("city") or "").strip()
        country = str(venue.get("country") or "").strip()

    origin_keyword = _origin_culture_keyword(brief)
    location_bits = " ".join(part for part in (city, country) if part)
    queries: list[str] = []

    if origin_keyword and country:
        queries.append(
            f"{origin_keyword} places landmarks culture popular with people in {country}"
        )
        if city:
            queries.append(
                f"{origin_keyword} travel culture Instagram {city} {country}"
            )
        else:
            queries.append(f"{origin_keyword} travel culture Instagram {country}")
    elif location_bits:
        # Fallback when origin culture cannot be inferred from the brief.
        queries.append(f"lifestyle subcultures {location_bits} Instagram")
        queries.append(f"creative class interests {location_bits}")

    return queries[:2]


async def _run_web_searches(queries: list[str]) -> str:
    search_tool = make_search_web_tool()
    if search_tool is None or not queries:
        return ""

    sections: list[str] = []
    for query in queries:
        try:
            result = await search_tool.ainvoke({"query": query})
        except Exception as exc:  # pragma: no cover - network/provider failures
            sections.append(f"### Query: {query}\n\n_Search failed: {exc}_")
            continue
        text = str(result).strip()
        if text:
            sections.append(f"### Query: {query}\n\n{text}")

    if not sections:
        return ""
    return (
        "## Heritage and audience culture web research (optional)\n\n"
        + "\n\n".join(sections)
    )


class CultureHookIntersectionDraft(BaseModel):
    topic: str
    conceptLink: str
    audienceRelevance: str
    contentExample: str


class CultureHooksDraftOutput(BaseModel):
    locationConcept: str
    targetAudience: str
    intersections: list[CultureHookIntersectionDraft]
    guardrailCheck: str


async def fetch_and_prepare(
    state: CultureHooksState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    """Build base generation markdown from prior campaign-brief context."""
    del client
    _trace(state, "execute_skill", skill_id="culture_hooks")
    owner_notes_markdown = _fmt_owner_notes(state)
    generation_context_markdown = _build_generation_context(state, owner_notes_markdown)
    return {
        "owner_notes_markdown": owner_notes_markdown,
        "generation_context_markdown": generation_context_markdown,
        "web_research_markdown": "",
    }


async def research_local_culture(state: CultureHooksState) -> dict[str, Any]:
    """Optionally enrich context with Tavily web research for local culture signals."""
    prior_json = str(state.get("prior_milestones_data") or "")
    brief = extract_restaurant_campaign_brief_data(prior_json)
    if brief is None:
        return {}

    queries = _culture_hooks_search_queries(brief)
    web_research_markdown = await _run_web_searches(queries)
    if not web_research_markdown:
        return {"web_research_markdown": ""}

    _trace(state, "culture_hooks_web_research", query_count=len(queries))
    owner_notes_markdown = str(state.get("owner_notes_markdown") or "")
    generation_context_markdown = _build_generation_context(
        state,
        owner_notes_markdown,
        web_research_markdown=web_research_markdown,
    )
    return {
        "web_research_markdown": web_research_markdown,
        "generation_context_markdown": generation_context_markdown,
    }


def _normalize_generated_output(payload: Any) -> CultureHooksOutput:
    normalized, error = validate_skill_output("culture_hooks", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "culture_hooks output validation failed")
    return normalized


async def generate_intersections(state: CultureHooksState) -> dict[str, Any]:
    """Generate structured non-food intersections from campaign brief context."""
    _trace_agent_event(state, "chat_model_start")
    try:
        generated = await structured_ainvoke_from_run_config(
            CultureHooksDraftOutput,
            [
                SystemMessage(content=CULTURE_HOOKS_SYSTEM),
                HumanMessage(content=str(state.get("generation_context_markdown") or "").strip()),
            ],
        )
    except LLMInvokeError as exc:
        emit_llm_error_step(exc.code, str(exc))
        raise ValueError(str(exc)) from exc
    _trace_agent_event(state, "chat_model_end")
    normalized = _normalize_generated_output(generated.model_dump(exclude_none=True))
    return {"generated_output": normalized}


async def persist_result(state: CultureHooksState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate and persist culture-hooks payload via milestone data upsert."""
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
