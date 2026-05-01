"""LangGraph: fetch milestone children, select skill(s), then ReAct agent(s) with milestone run tools."""

from __future__ import annotations

import logging
import re
from functools import partial
from typing import Any, Literal, cast

import httpx
from agents_app.agents.core.chat.graphql_client import fetch_milestone_node
from agents_app.agents.core.milestone_eval.graph import build_milestone_eval_graph
from agents_app.agents.core.milestone_eval.nodes import fetch_context
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_api_adapter_tools_for_location,
    fetch_prior_milestones_data,
)
from agents_app.agents.core.milestone_run.prior_context_inject import (
    build_injected_prior_context_markdown,
)
from agents_app.agents.core.milestone_run.prompts import (
    INTERMEDIATE_SKILL_PROMPT_SUFFIX,
    SKILL_SELECTOR_SYSTEM,
    execute_skill_task_message,
    skill_selector_human_message,
    workspace_adapter_tools_prompt_suffix,
)
from agents_app.agents.core.milestone_run.skill_settings import (
    normalize_skill_id_list,
    resolve_skill_selection_from_milestone_data,
)
from agents_app.agents.core.milestone_run.skills import (
    DEFAULT_SKILL_ID,
    SKILL_REGISTRY,
    format_skills_for_selector,
)
from agents_app.agents.core.milestone_run.state import MilestoneRunState
from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.config import get_config, get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)


def _trace_step(state: MilestoneRunState, step: str, **extra: Any) -> None:
    """Emit a custom stream chunk with ``step`` and ``run_id`` when present."""
    payload: dict[str, Any] = {"step": step, **extra}
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        payload["run_id"] = rid
    get_stream_writer()(payload)


def _trace_agent_event(state: MilestoneRunState, kind: str, **extra: Any) -> None:
    """Emit a sub-step trace during ReAct (does not change top-level ``step`` for the UI)."""
    payload: dict[str, Any] = {"agent_event": {"kind": kind, **extra}}
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        payload["run_id"] = rid
    get_stream_writer()(payload)


def _astream_event_tool_name(event: dict[str, Any]) -> str:
    """Best-effort tool name from LangGraph ``astream_events`` v2 payloads (redacted tracing only)."""
    n = event.get("name")
    if isinstance(n, str) and n.strip():
        return n.strip()
    data = event.get("data")
    if isinstance(data, dict):
        for key in ("name", "tool_name"):
            v = data.get(key)
            if isinstance(v, str) and v.strip():
                return v.strip()
    return ""


def _lc_run_config(state: MilestoneRunState, **metadata_extra: Any) -> dict[str, Any]:
    """RunnableConfig for LangChain/LangGraph (LangSmith picks up ``metadata`` / ``tags``)."""
    meta: dict[str, Any] = {
        "milestone_id": str(state["milestone_id"]),
        "location_id": int(state["location_id"]),
    }
    wf = state.get("workflow_id")
    if isinstance(wf, str) and wf.strip():
        meta["workflow_id"] = wf.strip()
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        meta["run_id"] = rid
    tp = state.get("traceparent")
    if isinstance(tp, str) and tp.strip():
        meta["traceparent"] = tp.strip()
    meta.update(metadata_extra)
    return {"metadata": meta, "tags": ["milestone_run"]}


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
    out = normalize_skill_id_list([str(x) for x in raw], SKILL_REGISTRY)
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
    try:
        adapters = await fetch_api_adapter_tools_for_location(
            int(state["location_id"]),
            str(state["user_id"]),
            client=client,
        )
    except Exception:
        _logger.exception(
            "milestone_run.fetch_children: api adapter tools fetch failed milestone_id=%s",
            mid,
        )
        raise

    row = await fetch_milestone_node(mid, str(state["user_id"]), client=client)
    raw_md = row.get("data") if isinstance(row, dict) else None
    milestone_data = raw_md if isinstance(raw_md, dict) else {}
    use_llm, fixed_ids = resolve_skill_selection_from_milestone_data(
        milestone_data,
        SKILL_REGISTRY,
    )
    request_goal = state.get("request_goal")
    goal = str(request_goal).strip() if isinstance(request_goal, str) and request_goal.strip() else str(out.get("goal", ""))
    # Do not seed milestone_data or raw_data from GraphQL milestonedata, fetch_context raw_data,
    # or request milestone_data (web preview). Milestone JSON is output-only for generation LLMs.
    milestone_data_payload: dict[str, Any] | list[Any] | None = None
    raw_data = ""
    base: dict[str, Any] = {
        **out,
        "goal": goal,
        "raw_data": raw_data,
        "milestone_data": milestone_data_payload,
        "milestone_input": state.get("milestone_input"),
        "prior_milestones_data": prior,
        "api_adapter_tools": adapters,
        "use_llm_skill_selector": use_llm,
    }
    if not use_llm and fixed_ids:
        first = fixed_ids[0]
        _trace_step(
            state,
            "select_skill",
            source="fixed",
            skill_ids=fixed_ids,
        )
        base["selected_skill_ids"] = fixed_ids
        base["current_skill_index"] = 0
        base["selected_skill_id"] = first
        _logger.info(
            "milestone_run.fetch_children: fixed skills milestone_id=%s skill_ids=%s",
            mid,
            fixed_ids,
        )
    else:
        _logger.info(
            "milestone_run.fetch_children: will use LLM skill selector milestone_id=%s",
            mid,
        )

    _logger.info(
        "milestone_run.fetch_children: done milestone_id=%s criteria_count=%s goal_len=%s session_raw_data_len=%s prior_len=%s adapters=%s",
        mid,
        len(out.get("criteria") or []),
        len(str(out.get("goal") or "")),
        len(raw_data),
        len(prior),
        len(adapters),
    )
    return base


async def _select_skills(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    del client  # unused; signature matches partial for symmetry
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.select_skills: start milestone_id=%s", mid)
    _trace_step(state, "select_skill")
    skills_md = format_skills_for_selector(SKILL_REGISTRY)
    human = skill_selector_human_message(
        str(state.get("goal", "")),
        state.get("criteria") or [],
        skills_md,
    )
    llm = get_llm_structured().with_structured_output(SkillSelections)
    selection = await llm.ainvoke(
        [
            SystemMessage(content=SKILL_SELECTOR_SYSTEM),
            HumanMessage(content=human),
        ],
        config=_lc_run_config(state, langgraph_node="select_skills"),
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
    _trace_step(state, "execute_skill", skill_id=sid, skill_index=idx, skill_count=len(ids))
    skill = SKILL_REGISTRY.get(sid) or SKILL_REGISTRY[DEFAULT_SKILL_ID]
    tools = make_milestone_run_tools(
        state,
        str(state["milestone_id"]),
        int(state["location_id"]),
        str(state["user_id"]),
        client=client,
        extra_tool_ids=skill.extra_tool_ids,
    )
    raw_adapters = state.get("api_adapter_tools", [])
    adapters_list = raw_adapters if isinstance(raw_adapters, list) else []
    adapter_suffix = workspace_adapter_tools_prompt_suffix(adapters_list)
    core_prompt = skill.prompt + adapter_suffix
    injection_md, injection_matched = build_injected_prior_context_markdown(
        str(state.get("prior_milestones_data") or ""),
        skill.inject_prior_presets,
    )
    if injection_md:
        core_prompt = core_prompt + "\n\n" + injection_md
    if skill.inject_prior_presets:
        _logger.info(
            "milestone_run.execute_skill: inject_prior_presets_config=%s matched=%s milestone_id=%s",
            list(skill.inject_prior_presets),
            injection_matched if injection_matched else "none_matched",
            mid,
        )
    system_prompt = core_prompt + ("" if is_last else INTERMEDIATE_SKILL_PROMPT_SUFFIX)
    # Non-streaming model avoids long stalls after large tool results (e.g. promotion JSON).
    llm = get_llm_structured()
    agent = create_react_agent(llm, tools, prompt=system_prompt)
    task_body = execute_skill_task_message(
        skill.id,
        skill.name,
        str(state.get("goal") or ""),
        milestone_input=state.get("milestone_input"),
    )
    agent_input = {
        "messages": [
            HumanMessage(content=task_body),
        ],
    }
    agent_cfg = cast(
        RunnableConfig,
        {
            **_lc_run_config(
                state,
                langgraph_node="execute_skill",
                skill_id=sid,
                skill_index=idx,
            ),
            # ReAct loop: parallel reads + prior + promotion tool + write + reply needs headroom.
            "recursion_limit": 48,
        },
    )
    async for event in agent.astream_events(
        agent_input,
        version="v2",
        config=agent_cfg,
    ):
        ev = cast(dict[str, Any], event)
        et = ev.get("event")
        if et == "on_tool_start":
            tname = _astream_event_tool_name(ev)
            if tname:
                _logger.info(
                    "milestone_run.execute_skill: tool_start name=%s milestone_id=%s", tname, mid
                )
                _trace_agent_event(state, "tool_start", name=tname)
        elif et == "on_tool_end":
            tname = _astream_event_tool_name(ev)
            if tname:
                _logger.info(
                    "milestone_run.execute_skill: tool_end name=%s milestone_id=%s", tname, mid
                )
                _trace_agent_event(state, "tool_end", name=tname)
        elif et == "on_chat_model_start":
            _trace_agent_event(state, "chat_model_start")
        elif et == "on_chat_model_end":
            _trace_agent_event(state, "chat_model_end")
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
    updated_data = str(state.get("result_data", "") or state.get("raw_data", ""))
    updated_payload = state.get("milestone_data")
    return {
        "current_skill_index": next_idx,
        "result_data": str(state.get("result_data", "")),
        "raw_data": updated_data,
        "milestone_data": updated_payload,
        "milestonedata_written": bool(state.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": last_verdicts,
        "selected_skill_id": ids[next_idx] if next_idx < len(ids) else ids[-1],
    }


def _route_after_fetch_children(state: MilestoneRunState) -> Literal["select_skills", "execute_skill"]:
    if state.get("use_llm_skill_selector", True):
        return "select_skills"
    return "execute_skill"


def _route_after_execute(state: MilestoneRunState) -> Literal["again", "finalize_eval"]:
    ids = state.get("selected_skill_ids") or []
    idx = int(state.get("current_skill_index") or 0)
    if idx < len(ids):
        return "again"
    return "finalize_eval"


async def _finalize_eval(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    """Run criterion scoring, summary synthesis, and result persistence (shared eval graph)."""
    mid = str(state["milestone_id"])
    _logger.info("milestone_run.finalize_eval: start milestone_id=%s", mid)
    _trace_step(state, "finalize_eval")

    eval_graph = build_milestone_eval_graph(client)
    initial: dict[str, Any] = {
        "milestone_id": state["milestone_id"],
        "location_id": int(state["location_id"]),
        "user_id": str(state["user_id"]),
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "evaluated": [],
        "result_summary": "",
        "result_node_id": None,
    }
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        initial["run_id"] = rid
    workflow_id = state.get("workflow_id")
    if isinstance(workflow_id, str) and workflow_id.strip():
        initial["workflow_id"] = workflow_id.strip()
    initial["milestone_input"] = state.get("milestone_input")

    try:
        run_cfg = get_config()
    except Exception:  # pragma: no cover - outside runnable context
        run_cfg = None

    writer = get_stream_writer()
    final_sub: dict[str, Any] | None = None

    async for mode, chunk in eval_graph.astream(
        initial,
        stream_mode=["custom", "values"],
        config=run_cfg,
    ):
        if mode == "custom" and isinstance(chunk, dict):
            payload = dict(chunk)
            rid2 = state.get("run_id")
            if isinstance(rid2, str) and rid2 and "run_id" not in payload:
                payload["run_id"] = rid2
            writer(payload)
        elif mode == "values" and isinstance(chunk, dict):
            final_sub = chunk

    if not isinstance(final_sub, dict):
        _logger.warning("milestone_run.finalize_eval: missing final state milestone_id=%s", mid)
        return {
            "result_summary": str(state.get("result_summary", "")),
            "result_node_id": state.get("result_node_id"),
            "last_criteria_verdicts": [],
        }

    evaluated = final_sub.get("evaluated", [])
    sse_verdicts: list[dict[str, Any]] = []
    if isinstance(evaluated, list):
        for row in evaluated:
            if isinstance(row, dict) and row.get("id"):
                sse_verdicts.append(
                    {"id": str(row["id"]), "status": str(row.get("status", ""))},
                )

    _logger.info(
        "milestone_run.finalize_eval: done milestone_id=%s result_id=%s verdict_count=%s",
        mid,
        final_sub.get("result_node_id"),
        len(sse_verdicts),
    )
    return {
        "result_summary": str(final_sub.get("result_summary", "") or ""),
        "result_node_id": final_sub.get("result_node_id"),
        "last_criteria_verdicts": sse_verdicts,
    }


def build_milestone_run_graph(client: httpx.AsyncClient):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""
    builder = StateGraph(MilestoneRunState)
    builder.add_node("fetch_children", partial(_fetch_children, client=client))
    builder.add_node("select_skills", partial(_select_skills, client=client))
    builder.add_node("execute_skill", partial(_execute_skill, client=client))
    builder.add_node("finalize_eval", partial(_finalize_eval, client=client))
    builder.add_edge(START, "fetch_children")
    builder.add_conditional_edges(
        "fetch_children",
        _route_after_fetch_children,
        {"select_skills": "select_skills", "execute_skill": "execute_skill"},
    )
    builder.add_edge("select_skills", "execute_skill")
    builder.add_conditional_edges(
        "execute_skill",
        _route_after_execute,
        {"again": "execute_skill", "finalize_eval": "finalize_eval"},
    )
    builder.add_edge("finalize_eval", END)
    return builder.compile()
