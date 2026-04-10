"""LangGraph: fetch milestone children, select skill, then ReAct agent with milestone run tools."""

from __future__ import annotations

import logging
import re
from functools import partial
from typing import Any

import httpx
from agents_app.agents.core.milestone_eval.nodes import fetch_context
from agents_app.agents.core.milestone_run.prompts import (
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


class SkillSelection(BaseModel):
    """Structured output from the skill-selection LLM."""

    skill_id: str = Field(
        description="Registry key for the skill to run (e.g. public_holidays or generic).",
    )


def _normalize_skill_id(raw: str) -> str:
    s = raw.strip().lower().replace("-", "_")
    s = re.sub(r"\s+", "_", s)
    return s


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
    _logger.info(
        "milestone_run.fetch_children: done milestone_id=%s criteria_count=%s goal_len=%s raw_data_len=%s",
        mid,
        len(out.get("criteria") or []),
        len(str(out.get("goal") or "")),
        len(str(out.get("raw_data") or "")),
    )
    return out


async def _select_skill(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client  # unused; signature matches partial for symmetry
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.select_skill: start milestone_id=%s", mid)
    writer = get_stream_writer()
    writer({"step": "select_skill"})
    skills_md = format_skills_for_selector(SKILL_REGISTRY)
    human = skill_selector_human_message(
        str(state.get("goal", "")),
        state.get("criteria") or [],
        str(state.get("raw_data", "")),
        skills_md,
    )
    llm = get_llm_structured().with_structured_output(SkillSelection)
    selection = await llm.ainvoke(
        [
            SystemMessage(content=SKILL_SELECTOR_SYSTEM),
            HumanMessage(content=human),
        ],
    )
    sid = _normalize_skill_id(selection.skill_id)
    if sid not in SKILL_REGISTRY:
        _logger.warning(
            "milestone_run.select_skill: unknown skill_id=%r, falling back to %s",
            selection.skill_id,
            DEFAULT_SKILL_ID,
        )
        sid = DEFAULT_SKILL_ID
    _logger.info("milestone_run.select_skill: done milestone_id=%s selected_skill_id=%s", mid, sid)
    return {"selected_skill_id": sid}


async def _execute_skill(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.execute_skill: start milestone_id=%s", mid)
    writer = get_stream_writer()
    writer({"step": "execute_skill"})
    sid = str(state.get("selected_skill_id") or DEFAULT_SKILL_ID)
    skill = SKILL_REGISTRY.get(sid) or SKILL_REGISTRY[DEFAULT_SKILL_ID]
    tools = make_milestone_run_tools(
        state,
        str(state["milestone_id"]),
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
    )
    llm = get_llm()
    agent = create_react_agent(llm, tools, prompt=skill.prompt)
    await agent.ainvoke(
        {
            "messages": [
                HumanMessage(content=execute_skill_task_message(skill.id, skill.name)),
            ],
        },
    )
    raw_last = state.get("last_criteria_verdicts", [])
    last_verdicts = list(raw_last) if isinstance(raw_last, list) else []
    _logger.info(
        "milestone_run.execute_skill: done milestone_id=%s result_node_id=%s verdict_count=%s",
        mid,
        state.get("result_node_id"),
        len(last_verdicts),
    )
    return {
        "result_data": str(state.get("result_data", "")),
        "milestonedata_written": bool(state.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": last_verdicts,
    }


def build_milestone_run_graph(client: httpx.AsyncClient):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""
    builder = StateGraph(MilestoneRunState)
    builder.add_node("fetch_children", partial(_fetch_children, client=client))
    builder.add_node("select_skill", partial(_select_skill, client=client))
    builder.add_node("execute_skill", partial(_execute_skill, client=client))
    builder.add_edge(START, "fetch_children")
    builder.add_edge("fetch_children", "select_skill")
    builder.add_edge("select_skill", "execute_skill")
    builder.add_edge("execute_skill", END)
    return builder.compile()
