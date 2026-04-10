"""LangGraph: fetch milestone children, select skill(s), then ReAct agent(s) with milestone run tools."""

from __future__ import annotations

import logging
import re
from functools import partial
from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_eval.nodes import fetch_context
from agents_app.agents.core.milestone_run.graphql_client import fetch_prior_milestones_data
from agents_app.agents.core.milestone_run.prompts import (
    INTERMEDIATE_SKILL_PROMPT_SUFFIX,
    SKILL_SELECTOR_SYSTEM,
    execute_skill_task_message,
    skill_selector_human_message,
)
from agents_app.agents.core.milestone_run.skills import (
    DEFAULT_SKILL_ID,
    SKILL_REGISTRY,
    format_skills_for_selector,
)
from agents_app.agents.core.milestone_run.state import MilestoneRunState
from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools
from agents_app.models.llm_config import get_llm, get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)


class SkillSelections(BaseModel):
    """Structured output from the skill-selection LLM (ordered list, 1–2 skills)."""

    skill_ids: list[str] = Field(
        description="Ordered registry keys to run (e.g. public_holidays then generic).",
    )


def _normalize_skill_id(raw: str) -> str:
    s = raw.strip().lower().replace("-", "_")
    s = re.sub(r"\s+", "_", s)
    return s


def _normalize_skill_id_list(raw: list[str]) -> list[str]:
    """Deduplicate, keep order, cap at 2; fall back to default if empty."""
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        sid = _normalize_skill_id(item)
        if sid in SKILL_REGISTRY and sid not in seen:
            out.append(sid)
            seen.add(sid)
        if len(out) >= 2:
            break
    if not out:
        return [DEFAULT_SKILL_ID]
    return out


async def _fetch_children(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    _logger.info(
        "milestone_run.fetch_children: start milestone_id=%s location_id=%s",
        mid,
        state["location_id"],
    )
    try:
        out = await fetch_context(state, client=client)  # type: ignore[arg-type]
    except Exception:
        _logger.exception("milestone_run.fetch_children: failed milestone_id=%s", mid)
        raise
    prior = ""
    wf_raw = state.get("workflow_id")
    if isinstance(wf_raw, str) and wf_raw.strip():
        try:
            prior = await fetch_prior_milestones_data(
                mid,
                wf_raw.strip(),
                int(state["location_id"]),
                str(state["user_id"]),
                client=client,
            )
        except Exception:
            _logger.exception(
                "milestone_run.fetch_children: prior milestones fetch failed milestone_id=%s",
                mid,
            )
            raise
    _logger.info(
        "milestone_run.fetch_children: done milestone_id=%s criteria_count=%s goal_len=%s raw_data_len=%s prior_len=%s",
        mid,
        len(out.get("criteria") or []),
        len(str(out.get("goal") or "")),
        len(str(out.get("raw_data") or "")),
        len(prior),
    )
    return {**out, "prior_milestones_data": prior}


async def _select_skills(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client  # unused; signature matches partial for symmetry
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.select_skills: start milestone_id=%s", mid)
    writer = get_stream_writer()
    writer({"step": "select_skill"})
    skills_md = format_skills_for_selector(SKILL_REGISTRY)
    human = skill_selector_human_message(
        str(state.get("goal", "")),
        state.get("criteria") or [],
        str(state.get("raw_data", "")),
        skills_md,
    )
    llm = get_llm_structured().with_structured_output(SkillSelections)
    selection = await llm.ainvoke(
        [
            SystemMessage(content=SKILL_SELECTOR_SYSTEM),
            HumanMessage(content=human),
        ],
    )
    ids = _normalize_skill_id_list(list(selection.skill_ids))
    for raw in selection.skill_ids:
        sid = _normalize_skill_id(str(raw))
        if sid not in SKILL_REGISTRY:
            _logger.warning(
                "milestone_run.select_skills: unknown skill_id=%r ignored",
                raw,
            )
    first = ids[0] if ids else DEFAULT_SKILL_ID
    _logger.info(
        "milestone_run.select_skills: done milestone_id=%s selected_skill_ids=%s",
        mid,
        ids,
    )
    return {
        "selected_skill_ids": ids,
        "current_skill_index": 0,
        "selected_skill_id": first,
    }


async def _execute_skill(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    ids = list(state.get("selected_skill_ids") or [])
    idx = int(state.get("current_skill_index") or 0)
    if idx < 0 or idx >= len(ids):
        _logger.warning(
            "milestone_run.execute_skill: invalid index idx=%s len=%s milestone_id=%s",
            idx,
            len(ids),
            mid,
        )
        return {"current_skill_index": len(ids)}

    sid = ids[idx]
    is_last = idx == len(ids) - 1
    _logger.info(
        "milestone_run.execute_skill: start milestone_id=%s index=%s/%s skill_id=%s last=%s",
        mid,
        idx,
        len(ids),
        sid,
        is_last,
    )
    writer = get_stream_writer()
    writer({"step": "execute_skill"})
    skill = SKILL_REGISTRY.get(sid) or SKILL_REGISTRY[DEFAULT_SKILL_ID]
    tools = make_milestone_run_tools(
        state,
        str(state["milestone_id"]),
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
        include_write_result=is_last,
    )
    system_prompt = skill.prompt
    if not is_last:
        system_prompt = skill.prompt + INTERMEDIATE_SKILL_PROMPT_SUFFIX
    llm = get_llm()
    agent = create_react_agent(llm, tools, prompt=system_prompt)
    await agent.ainvoke(
        {
            "messages": [
                HumanMessage(content=execute_skill_task_message(skill.id, skill.name)),
            ],
        },
    )
    raw_last = state.get("last_criteria_verdicts", [])
    last_verdicts = list(raw_last) if isinstance(raw_last, list) else []
    next_idx = idx + 1
    _logger.info(
        "milestone_run.execute_skill: done milestone_id=%s result_node_id=%s verdict_count=%s next_idx=%s",
        mid,
        state.get("result_node_id"),
        len(last_verdicts),
        next_idx,
    )
    return {
        "current_skill_index": next_idx,
        "result_data": str(state.get("result_data", "")),
        "milestonedata_written": bool(state.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": last_verdicts,
        "selected_skill_id": ids[next_idx] if next_idx < len(ids) else ids[-1],
    }


def _route_after_execute(state: MilestoneRunState) -> Literal["again", "stop"]:
    ids = state.get("selected_skill_ids") or []
    idx = int(state.get("current_skill_index") or 0)
    if idx < len(ids):
        return "again"
    return "stop"


def build_milestone_run_graph(client: httpx.AsyncClient):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""
    builder = StateGraph(MilestoneRunState)
    builder.add_node("fetch_children", partial(_fetch_children, client=client))
    builder.add_node("select_skills", partial(_select_skills, client=client))
    builder.add_node("execute_skill", partial(_execute_skill, client=client))
    builder.add_edge(START, "fetch_children")
    builder.add_edge("fetch_children", "select_skills")
    builder.add_edge("select_skills", "execute_skill")
    builder.add_conditional_edges(
        "execute_skill",
        _route_after_execute,
        {"again": "execute_skill", "stop": END},
    )
    return builder.compile()
