"""Nodes for dedicated IG profile generation and persistence."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import upsert_milestonedata_node
from agents_app.agents.core.milestone_run.ig_profile.prompts import IG_PROFILE_SYSTEM
from agents_app.agents.core.milestone_run.ig_profile.state import IgProfileOutput, IgProfileState
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_llm_from_milestone_run_config,
)
from agents_app.agents.core.milestone_run.output_schema import (
    clamp_ig_profile_bio_text,
    validate_skill_output,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, field_validator


def _trace(state: IgProfileState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _trace_agent_event(state: IgProfileState, kind: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    run_id = state.get("run_id")
    if isinstance(run_id, str) and run_id:
        payload["run_id"] = run_id
    get_stream_writer()(payload)


def _fmt_owner_notes(state: IgProfileState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") != "ig_profile":
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


def _build_generation_context(state: IgProfileState, owner_notes_markdown: str) -> str:
    goal = str(state.get("goal") or "").strip() or "_No goal provided._"
    criteria = state.get("criteria") or []
    criteria_json = json.dumps(criteria, ensure_ascii=False, indent=2)
    injected = str(state.get("injected_prior_context_markdown") or "").strip()
    if not injected:
        raise ValueError("ig_profile requires a prior restaurant_campaign_brief milestone")

    sections: list[str] = [
        f"## Milestone goal\n{goal}",
        f"## Milestone criteria\n```json\n{criteria_json}\n```",
        injected,
    ]
    if owner_notes_markdown:
        sections.append(owner_notes_markdown)
    return "\n\n".join(sections)


class IgProfileUsernameDraft(BaseModel):
    username: str
    rationale: str


class IgProfileBioDraft(BaseModel):
    text: str
    hook: str
    valueProp: str
    cta: str
    tone: str

    @field_validator("text")
    @classmethod
    def _clamp_bio_text(cls, value: str) -> str:
        return clamp_ig_profile_bio_text(value)


class IgProfileDraftOutput(BaseModel):
    usernames: list[IgProfileUsernameDraft]
    bios: list[IgProfileBioDraft]


async def fetch_and_prepare(state: IgProfileState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Build generation markdown from prior campaign-brief context only."""
    del client
    _trace(state, "execute_skill", skill_id="ig_profile")
    owner_notes_markdown = _fmt_owner_notes(state)
    generation_context_markdown = _build_generation_context(state, owner_notes_markdown)
    return {
        "owner_notes_markdown": owner_notes_markdown,
        "generation_context_markdown": generation_context_markdown,
    }


def _normalize_generated_output(payload: Any) -> IgProfileOutput:
    normalized, error = validate_skill_output("ig_profile", payload)
    if error is not None or not isinstance(normalized, dict):
        raise ValueError(error or "ig_profile output validation failed")
    return normalized  # type: ignore[return-value]


async def generate_profile(state: IgProfileState) -> dict[str, Any]:
    """Generate structured IG profile suggestions from campaign brief context."""
    llm = structured_llm_from_milestone_run_config().with_structured_output(IgProfileDraftOutput)
    _trace_agent_event(state, "chat_model_start")
    generated = await llm.ainvoke(
        [
            SystemMessage(content=IG_PROFILE_SYSTEM),
            HumanMessage(content=str(state.get("generation_context_markdown") or "").strip()),
        ]
    )
    _trace_agent_event(state, "chat_model_end")
    normalized = _normalize_generated_output(generated.model_dump(exclude_none=True))
    return {"generated_output": normalized}


async def persist_result(state: IgProfileState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Validate and persist IG profile payload via milestone data upsert."""
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
