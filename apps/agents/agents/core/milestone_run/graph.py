"""LangGraph: fetch milestone children, run dedicated preset graph, then eval."""

from __future__ import annotations

import logging
from functools import partial
from typing import Any

import httpx
from agents_app.agents.core.chat.graphql_client import fetch_milestone_node
from agents_app.agents.core.milestone_eval.graph import build_milestone_eval_graph
from agents_app.agents.core.milestone_eval.nodes import fetch_context
from agents_app.agents.core.milestone_run.campaign_brief.graph import build_campaign_brief_graph
from agents_app.agents.core.milestone_run.culture_hooks.graph import build_culture_hooks_graph
from agents_app.agents.core.milestone_run.dates.graph import build_dates_graph
from agents_app.agents.core.milestone_run.graphql_client import fetch_prior_milestones_data
from agents_app.agents.core.milestone_run.ig_profile.graph import build_ig_profile_graph
from agents_app.agents.core.milestone_run.menu_tagger.graph import build_menu_tagger_graph
from agents_app.agents.core.milestone_run.post_lineup.graph import build_post_lineup_graph
from agents_app.agents.core.milestone_run.prior_context_inject import (
    build_injected_prior_context_markdown,
)
from agents_app.agents.core.milestone_run.promotion_candidates.graph import (
    build_promotion_candidates_graph,
)
from agents_app.agents.core.milestone_run.reel_lineup.graph import build_reel_lineup_graph
from agents_app.agents.core.milestone_run.scheduler.graph import build_scheduler_graph
from agents_app.agents.core.milestone_run.state import MilestoneRunState
from agents_app.agents.core.milestone_run.story_lineup.graph import build_story_lineup_graph
from langgraph.config import get_config, get_stream_writer
from langgraph.graph import END, START, StateGraph

_logger = logging.getLogger(__name__)


def _trace_step(state: MilestoneRunState, step: str, **extra: Any) -> None:
    payload: dict[str, Any] = {"step": step, **extra}
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        payload["run_id"] = rid
    get_stream_writer()(payload)


async def _stream_subgraph(
    graph: Any,
    initial: dict[str, Any],
    *,
    state: MilestoneRunState,
) -> dict[str, Any]:
    try:
        run_cfg = get_config()
    except Exception:  # pragma: no cover - outside runnable context
        run_cfg = None
    writer = get_stream_writer()
    rid = state.get("run_id")
    final_sub: dict[str, Any] | None = None

    async for mode, chunk in graph.astream(
        initial,
        stream_mode=["custom", "values"],
        config=run_cfg,
    ):
        if mode == "custom" and isinstance(chunk, dict):
            payload = dict(chunk)
            if isinstance(rid, str) and rid and "run_id" not in payload:
                payload["run_id"] = rid
            writer(payload)
        elif mode == "values" and isinstance(chunk, dict):
            final_sub = chunk

    if not isinstance(final_sub, dict):
        raise RuntimeError("dedicated milestone graph did not produce a final state")
    return final_sub


def _base_initial(state: MilestoneRunState) -> dict[str, Any]:
    initial: dict[str, Any] = {
        "milestone_id": state["milestone_id"],
        "location_id": int(state["location_id"]),
        "user_id": str(state["user_id"]),
        "goal": str(state.get("goal", "")),
        "criteria": state.get("criteria") or [],
        "milestone_input": state.get("milestone_input"),
    }
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        initial["run_id"] = rid
    tp = state.get("traceparent")
    if isinstance(tp, str) and tp.strip():
        initial["traceparent"] = tp.strip()
    return initial


async def _run_campaign_brief(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    final_sub = await _stream_subgraph(
        build_campaign_brief_graph(client),
        _base_initial(state),
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_promotion_candidates(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["injected_prior_context_markdown"] = build_injected_prior_context_markdown(
        initial["prior_milestones_data"],
        ("restaurant_campaign_brief",),
    )[0]
    final_sub = await _stream_subgraph(
        build_promotion_candidates_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_menu_tagger(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["result_data"] = ""
    initial["milestonedata_written"] = False
    final_sub = await _stream_subgraph(
        build_menu_tagger_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_reel_lineup(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["result_data"] = ""
    initial["milestonedata_written"] = False
    final_sub = await _stream_subgraph(
        build_reel_lineup_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_post_lineup(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["result_data"] = ""
    initial["milestonedata_written"] = False
    final_sub = await _stream_subgraph(
        build_post_lineup_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_story_lineup(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["result_data"] = ""
    initial["milestonedata_written"] = False
    final_sub = await _stream_subgraph(
        build_story_lineup_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_scheduler(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["result_data"] = ""
    initial["milestonedata_written"] = False
    final_sub = await _stream_subgraph(
        build_scheduler_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_culture_hooks(
    state: MilestoneRunState, *, client: httpx.AsyncClient
) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["injected_prior_context_markdown"] = build_injected_prior_context_markdown(
        initial["prior_milestones_data"],
        ("restaurant_campaign_brief",),
    )[0]
    final_sub = await _stream_subgraph(
        build_culture_hooks_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_ig_profile(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    initial = _base_initial(state)
    initial["prior_milestones_data"] = str(state.get("prior_milestones_data") or "")
    initial["injected_prior_context_markdown"] = build_injected_prior_context_markdown(
        initial["prior_milestones_data"],
        ("restaurant_campaign_brief",),
    )[0]
    final_sub = await _stream_subgraph(
        build_ig_profile_graph(client),
        initial,
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _run_dates(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    final_sub = await _stream_subgraph(
        build_dates_graph(client),
        _base_initial(state),
        state=state,
    )
    return {
        "result_data": str(final_sub.get("result_data", "")),
        "raw_data": str(final_sub.get("result_data", "") or state.get("raw_data", "")),
        "milestone_data": final_sub.get("milestone_data"),
        "milestonedata_written": bool(final_sub.get("milestonedata_written")),
        "result_summary": str(state.get("result_summary", "")),
        "result_node_id": state.get("result_node_id"),
        "last_criteria_verdicts": list(state.get("last_criteria_verdicts") or []),
    }


async def _fetch_children(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    out = await fetch_context(state, client=client)  # type: ignore[arg-type]
    prior = ""
    wf_raw = state.get("workflow_id")
    if isinstance(wf_raw, str) and wf_raw.strip():
        prior = await fetch_prior_milestones_data(
            mid,
            wf_raw.strip(),
            int(state["location_id"]),
            str(state["user_id"]),
            client=client,
        )

    row = await fetch_milestone_node(mid, str(state["user_id"]), client=client)
    raw_md = row.get("data") if isinstance(row, dict) else None
    milestone_node_data = raw_md if isinstance(raw_md, dict) else {}
    pass_rows = milestone_node_data.get("passCriterias")
    criteria: list[dict[str, str]] = []
    if isinstance(pass_rows, list):
        for item in pass_rows:
            if not isinstance(item, dict):
                continue
            cid = item.get("id")
            req = item.get("requirement")
            if isinstance(cid, str) and cid and isinstance(req, str):
                criteria.append({"id": cid, "requirement": req})
    raw_preset = milestone_node_data.get("presetId")
    preset_id = raw_preset.strip() if isinstance(raw_preset, str) else ""
    if not preset_id:
        raise RuntimeError(
            f"milestone_run requires milestone.data.presetId for dedicated dispatch (milestone_id={mid})"
        )

    request_goal = state.get("request_goal")
    goal = (
        str(request_goal).strip()
        if isinstance(request_goal, str) and request_goal.strip()
        else str(out.get("goal", ""))
    )
    return {
        **out,
        "criteria": criteria,
        "goal": goal,
        "raw_data": "",
        "milestone_data": None,
        "milestone_input": state.get("milestone_input"),
        "prior_milestones_data": prior,
        "preset_id": preset_id,
    }


async def _execute_preset(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    mid = str(state["milestone_id"])
    preset_id = str(state.get("preset_id") or "").strip()
    _trace_step(state, "execute_preset", preset_id=preset_id)
    _logger.info("milestone_run.execute_preset: milestone_id=%s preset_id=%s", mid, preset_id)
    if preset_id == "restaurant_campaign_brief":
        return await _run_campaign_brief(state, client=client)
    if preset_id == "promotion_candidates":
        return await _run_promotion_candidates(state, client=client)
    if preset_id == "menu_tagger":
        return await _run_menu_tagger(state, client=client)
    if preset_id == "reel_lineup":
        return await _run_reel_lineup(state, client=client)
    if preset_id == "post_lineup":
        return await _run_post_lineup(state, client=client)
    if preset_id == "story_lineup":
        return await _run_story_lineup(state, client=client)
    if preset_id == "scheduler":
        return await _run_scheduler(state, client=client)
    if preset_id == "culture_hooks":
        return await _run_culture_hooks(state, client=client)
    if preset_id == "ig_profile":
        return await _run_ig_profile(state, client=client)
    if preset_id == "dates":
        return await _run_dates(state, client=client)
    raise RuntimeError(
        f"Unsupported milestone preset for dedicated dispatch: {preset_id!r} (milestone_id={mid})"
    )


async def _finalize_eval(state: MilestoneRunState, *, client: httpx.AsyncClient) -> dict[str, Any]:
    _trace_step(state, "finalize_eval")
    raw_gw = state.get("chat_gateway_model")
    gateway_id = raw_gw.strip() if isinstance(raw_gw, str) and raw_gw.strip() else None
    eval_graph = build_milestone_eval_graph(client, gateway_model_id=gateway_id)
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
        "milestone_input": state.get("milestone_input"),
    }
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        initial["run_id"] = rid
    workflow_id = state.get("workflow_id")
    if isinstance(workflow_id, str) and workflow_id.strip():
        initial["workflow_id"] = workflow_id.strip()

    final_sub = await _stream_subgraph(eval_graph, initial, state=state)
    evaluated = final_sub.get("evaluated", [])
    sse_verdicts: list[dict[str, Any]] = []
    if isinstance(evaluated, list):
        for row in evaluated:
            if isinstance(row, dict) and row.get("id"):
                sse_verdicts.append({"id": str(row["id"]), "status": str(row.get("status", ""))})
    return {
        "result_summary": str(final_sub.get("result_summary", "") or ""),
        "result_node_id": final_sub.get("result_node_id"),
        "last_criteria_verdicts": sse_verdicts,
    }


def build_milestone_run_graph(client: httpx.AsyncClient):
    builder = StateGraph(MilestoneRunState)
    builder.add_node("fetch_children", partial(_fetch_children, client=client))
    builder.add_node("execute_preset", partial(_execute_preset, client=client))
    builder.add_node("finalize_eval", partial(_finalize_eval, client=client))
    builder.add_edge(START, "fetch_children")
    builder.add_edge("fetch_children", "execute_preset")
    builder.add_edge("execute_preset", "finalize_eval")
    builder.add_edge("finalize_eval", END)
    return builder.compile()
