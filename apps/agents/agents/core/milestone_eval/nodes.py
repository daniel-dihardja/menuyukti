"""LangGraph node callables for milestone evaluation (testable, injectable)."""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_eval.graphql_client import (
    delete_node,
    fetch_milestone_children,
    fetch_prior_milestones_data_for_eval,
    update_passcriteria_status,
    upsert_result_node,
)
from agents_app.agents.core.milestone_eval.prompts import (
    EVAL_SYSTEM,
    SYNTHESIS_SYSTEM,
    eval_human_message,
    synthesis_human_message,
)
from agents_app.agents.core.milestone_eval.state import CriterionEval, MilestoneEvalState
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from langgraph.types import Send
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)
_DEBUG_LOG_PATH = (
    "/Users/danieldihardja/dev/AI-Products/menuyukti/v3/.cursor/debug-c27d4e.log"
)


def _debug_log(
    *,
    run_id: str,
    hypothesis_id: str,
    location: str,
    message: str,
    data: dict[str, Any],
) -> None:
    payload = {
        "sessionId": "c27d4e",
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with open(_DEBUG_LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _milestonedata_eval_score(data: dict[str, Any]) -> int:
    """Prefer larger milestonedata payloads (eval tie-breaking)."""
    try:
        return len(json.dumps(data, ensure_ascii=False))
    except (TypeError, ValueError):
        return 0


def _select_best_milestonedata_payload(payloads: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not payloads:
        return None
    if len(payloads) == 1:
        return payloads[0]
    return max(payloads, key=_milestonedata_eval_score)


class CriterionVerdict(BaseModel):
    """Structured LLM output for a single pass/fail decision."""

    status: Literal["pass", "fail"] = Field(description="pass or fail")
    reasoning: str = Field(description="One short sentence justification")


def _node_type(ch: dict[str, Any]) -> str:
    return str(ch.get("nodeType") or ch.get("node_type") or "")


_OWNER_NOTES_INPUT_TYPES = frozenset(
    {"restaurant_campaign_brief", "promotion_candidates", "post_scheduler"},
)


def _extract_milestone_input_notes(state: MilestoneEvalState) -> str:
    raw = state.get("milestone_input")
    if not isinstance(raw, dict):
        return ""
    if raw.get("type") not in _OWNER_NOTES_INPUT_TYPES:
        return ""
    value = raw.get("value")
    if not isinstance(value, dict):
        return ""
    notes = value.get("notes")
    if not isinstance(notes, str):
        return ""
    return notes.strip()


_OPTIONAL_INPUT_FRAGMENT_RE = re.compile(
    r"(?is)\bOptional input usage:\s*(?:used|not used|given|not given)\b(?:\s*[—-]\s*[^\n]*)?\.?"
)


def _optional_input_usage_line(notes: str) -> str:
    cleaned_notes = notes.strip()
    if not cleaned_notes:
        return "Optional input usage: not given."
    return "Optional input usage: given."


def _enforce_optional_input_line(summary: str, notes: str) -> str:
    without_existing = _OPTIONAL_INPUT_FRAGMENT_RE.sub("", summary)
    without_existing = re.sub(r"[ \t]{2,}", " ", without_existing)
    without_existing = re.sub(r"\n{3,}", "\n\n", without_existing)
    without_existing = without_existing.strip()
    usage_line = _optional_input_usage_line(notes)
    if not without_existing:
        return usage_line
    return f"{without_existing}\n\n{usage_line}"


async def fetch_context(
    state: MilestoneEvalState,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    mid = state["milestone_id"]
    loc = state["location_id"]
    writer = get_stream_writer()
    fc_payload: dict[str, Any] = {"step": "fetch_context"}
    rid = state.get("run_id")
    if isinstance(rid, str) and rid:
        fc_payload["run_id"] = rid
    writer(fc_payload)
    _logger.info(
        "milestone_eval.fetch_context: emitted step fetch_context; calling GraphQL nodes(parentId=%s)",
        mid,
    )
    children = await fetch_milestone_children(
        mid,
        loc,
        state["user_id"],
        client=client,
    )
    _logger.info(
        "milestone_eval.fetch_context: GraphQL returned %s child nodes for milestone_id=%s location_id=%s",
        len(children),
        mid,
        loc,
    )
    goal = ""
    milestonedata_payloads: list[dict[str, Any]] = []
    criteria: list[dict[str, str]] = []
    for ch in children:
        nt = _node_type(ch)
        raw = ch.get("data")
        data = raw if isinstance(raw, dict) else {}
        if nt == "goal":
            g = data.get("goal")
            if isinstance(g, str):
                goal = g
        elif nt == "milestonedata":
            if isinstance(data, dict) and data:
                milestonedata_payloads.append(data)
        elif nt == "passcriteria":
            req = data.get("requirement", "")
            cid = str(ch.get("id", ""))
            if isinstance(req, str) and cid:
                criteria.append({"id": cid, "requirement": req})
    best_md = _select_best_milestonedata_payload(milestonedata_payloads)
    raw_data = (
        json.dumps(best_md, ensure_ascii=False, indent=2)
        if best_md is not None
        else ""
    )
    prior_context = ""
    workflow_id = state.get("workflow_id")
    if isinstance(workflow_id, str) and workflow_id.strip():
        prior_context = await fetch_prior_milestones_data_for_eval(
            workflow_id.strip(),
            mid,
            loc,
            state["user_id"],
            client=client,
        )
    if prior_context:
        raw_data = (
            f"{raw_data}\n\n---\nPrior milestone context (for requirement checks):\n{prior_context}"
            if raw_data
            else f"Prior milestone context (for requirement checks):\n{prior_context}"
        )
    # region agent log
    _debug_log(
        run_id=str(state.get("run_id") or "unknown"),
        hypothesis_id="H8",
        location="milestone_eval/nodes.py:fetch_context",
        message="eval context assembled",
        data={
            "criteria_count": len(criteria),
            "prior_len": len(prior_context),
            "raw_data_len": len(raw_data),
            "raw_data_has_air_mineral": "AIR MINERAL" in raw_data.upper(),
        },
    )
    # endregion
    return {"goal": goal, "raw_data": raw_data, "criteria": criteria}


async def evaluate_criterion(
    state: dict[str, Any],
    *,
    structured_llm: Any,
) -> dict[str, Any]:
    goal = str(state.get("goal", ""))
    raw_data = str(state.get("raw_data", ""))
    criterion_id = str(state.get("criterion_id", ""))
    requirement = str(state.get("requirement", ""))
    verdict = await structured_llm.ainvoke(
        [
            SystemMessage(content=EVAL_SYSTEM),
            HumanMessage(content=eval_human_message(goal, raw_data, requirement)),
        ]
    )
    # region agent log
    _debug_log(
        run_id=str(state.get("run_id") or "unknown"),
        hypothesis_id="H7",
        location="milestone_eval/nodes.py:evaluate_criterion",
        message="criterion verdict generated",
        data={
            "criterion_id": criterion_id,
            "requirement": requirement,
            "status": verdict.status,
            "reasoning": verdict.reasoning,
            "raw_data_has_air_mineral": "AIR MINERAL" in raw_data.upper(),
            "raw_data_len": len(raw_data),
        },
    )
    # endregion
    writer = get_stream_writer()
    writer(
        {
            "step": "evaluate_criterion",
            "id": criterion_id,
            "status": verdict.status,
        }
    )
    row: CriterionEval = {
        "id": criterion_id,
        "requirement": requirement,
        "status": verdict.status,
        "reasoning": verdict.reasoning,
    }
    return {"evaluated": [row]}


async def update_criteria(
    state: MilestoneEvalState,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    writer = get_stream_writer()
    writer({"step": "update_criteria"})
    for ev in state.get("evaluated", []):
        await update_passcriteria_status(
            ev["id"],
            ev["status"],
            state["user_id"],
            client=client,
        )
    return {}


async def synthesize(
    state: MilestoneEvalState,
    *,
    llm: BaseChatModel,
) -> dict[str, Any]:
    writer = get_stream_writer()
    writer({"step": "synthesize"})
    evaluated = state.get("evaluated", [])
    payload = [
        {
            "id": e["id"],
            "requirement": e["requirement"],
            "status": e["status"],
            "reasoning": e["reasoning"],
        }
        for e in evaluated
    ]
    notes = _extract_milestone_input_notes(state)
    msg = synthesis_human_message(state.get("goal", ""), payload, notes)
    full = ""
    async for chunk in llm.astream(
        [SystemMessage(content=SYNTHESIS_SYSTEM), HumanMessage(content=msg)]
    ):
        c = chunk.content
        if isinstance(c, str):
            full += c
        elif isinstance(c, list):
            full += "".join(str(x) for x in c)
    summary = _enforce_optional_input_line(
        full.strip(),
        notes,
    )
    return {"result_summary": summary}


async def store_result(
    state: MilestoneEvalState,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    writer = get_stream_writer()
    writer({"step": "store_result"})
    children = await fetch_milestone_children(
        state["milestone_id"],
        state["location_id"],
        state["user_id"],
        client=client,
    )
    existing_result_id: str | None = None
    for ch in children:
        if _node_type(ch) == "result":
            rid = str(ch.get("id", ""))
            if rid and existing_result_id is None:
                existing_result_id = rid
            elif rid:
                await delete_node(rid, state["user_id"], client=client)

    evaluated = state.get("evaluated", [])
    passed = sum(1 for e in evaluated if e.get("status") == "pass")
    total = len(evaluated)
    criteria_out = [
        {
            "id": e["id"],
            "requirement": e["requirement"],
            "status": e["status"],
            "reasoning": e["reasoning"],
        }
        for e in evaluated
    ]
    data = {
        "summary": state.get("result_summary", ""),
        "passed": passed,
        "total": total,
        "criteria": criteria_out,
    }
    node = await upsert_result_node(
        result_node_id=existing_result_id,
        milestone_id=state["milestone_id"],
        location_id=state["location_id"],
        data=data,
        user_id=state["user_id"],
        client=client,
    )
    nid = str(node.get("id", ""))
    return {"result_node_id": nid}


def route_after_fetch(
    state: MilestoneEvalState,
) -> list[Send] | Literal["synthesize"]:
    crit = state.get("criteria") or []
    if not crit:
        return "synthesize"
    return [
        Send(
            "evaluate_criterion",
            {
                "goal": state.get("goal", ""),
                "raw_data": state.get("raw_data", ""),
                "criterion_id": c["id"],
                "requirement": c["requirement"],
            },
        )
        for c in crit
    ]
