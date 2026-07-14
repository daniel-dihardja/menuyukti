"""LangGraph node callables for milestone evaluation (testable, injectable)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

import httpx
from agents_app.agents.core.llm_invoke import (
    LLMInvokeError,
    ainvoke_with_retry,
    astream_collect_with_retry,
    emit_llm_error_step,
)
from agents_app.agents.core.milestone_eval.campaign_brief_eval import (
    enrich_campaign_brief_eval_payload,
    try_campaign_brief_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.dates_eval import (
    enrich_dates_eval_payload,
    try_dates_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.graphql_client import (
    fetch_milestone_node,
    fetch_prior_milestones_data_for_eval,
    update_milestone_passcriteria_statuses,
    upsert_result_node,
)
from agents_app.agents.core.milestone_eval.ig_format_eval import (
    enrich_ig_format_eval_payload,
    try_ig_format_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.ig_menu_picker_eval import (
    enrich_ig_menu_picker_eval_payload,
    try_ig_menu_picker_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.ig_plan_eval import (
    enrich_ig_plan_eval_payload,
    try_ig_plan_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.ig_profile_eval import (
    enrich_ig_profile_eval_payload,
    parse_milestone_data_from_eval_raw,
    try_ig_profile_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.ig_text_eval import (
    enrich_ig_text_eval_payload,
    try_ig_text_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.menu_clusterer_eval import (
    enrich_menu_clusterer_eval_payload,
    try_menu_clusterer_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.menu_tagger_eval import (
    enrich_menu_tagger_eval_payload,
    try_menu_tagger_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.post_lineup_eval import (
    enrich_post_lineup_eval_payload,
    try_post_lineup_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.prompts import (
    EVAL_SYSTEM,
    SYNTHESIS_SYSTEM,
    eval_human_message,
    synthesis_human_message,
)
from agents_app.agents.core.milestone_eval.reel_lineup_eval import (
    enrich_reel_lineup_eval_payload,
    try_reel_lineup_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.scheduler_eval import (
    enrich_scheduler_eval_payload,
    try_scheduler_deterministic_verdict,
)
from agents_app.agents.core.milestone_eval.state import CriterionEval, MilestoneEvalState
from agents_app.agents.core.milestone_eval.story_lineup_eval import (
    enrich_story_lineup_eval_payload,
    try_story_lineup_deterministic_verdict,
)
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from langgraph.types import Send
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)


def _enrich_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    return enrich_ig_text_eval_payload(
        enrich_ig_format_eval_payload(
            enrich_ig_menu_picker_eval_payload(
                enrich_ig_plan_eval_payload(
                    enrich_campaign_brief_eval_payload(
                        enrich_scheduler_eval_payload(
                            enrich_story_lineup_eval_payload(
                                enrich_reel_lineup_eval_payload(
                                    enrich_post_lineup_eval_payload(
                                        enrich_menu_clusterer_eval_payload(
                                            enrich_menu_tagger_eval_payload(
                                                enrich_dates_eval_payload(
                                                    enrich_ig_profile_eval_payload(data)
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    )


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


_OWNER_NOTES_INPUT_TYPES = frozenset(
    {
        "restaurant_campaign_brief",
        "culture_hooks",
        "menu_tagger",
        "menu_clusterer",
        "post_lineup",
        "reel_lineup",
        "story_lineup",
        "scheduler",
        "ig_profile",
        "ig_format",
    },
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
        "milestone_eval.fetch_context: emitted step fetch_context; loading milestone %s",
        mid,
    )

    existing_raw = str(state.get("raw_data") or "").strip()
    existing_criteria = state.get("criteria") or []
    existing_goal = str(state.get("goal") or "").strip()
    if existing_raw and existing_criteria:
        preset_id = str(state.get("preset_id") or "").strip()
        writer(fc_payload)
        return {
            "goal": existing_goal,
            "raw_data": existing_raw,
            "criteria": list(existing_criteria),
            "preset_id": preset_id,
        }

    milestone_row = await fetch_milestone_node(mid, state["user_id"], client=client)
    _logger.info(
        "milestone_eval.fetch_context: loaded milestone row for milestone_id=%s location_id=%s",
        mid,
        loc,
    )

    goal = ""
    if isinstance(milestone_row, dict):
        mg = milestone_row.get("milestoneGoal")
        if isinstance(mg, str) and mg.strip():
            goal = mg.strip()
        else:
            md = milestone_row.get("data")
            if isinstance(md, dict):
                gv = md.get("goal")
                if isinstance(gv, str):
                    goal = gv

    best_md: dict[str, Any] | None = None
    if isinstance(milestone_row, dict):
        mpd = milestone_row.get("milestonePresetData")
        if isinstance(mpd, dict):
            best_md = mpd

    criteria: list[dict[str, str]] = []
    raw_pass = milestone_row.get("passCriterias") if isinstance(milestone_row, dict) else None
    if not isinstance(raw_pass, list) and isinstance(milestone_row, dict):
        md = milestone_row.get("data")
        raw_pass = md.get("passCriterias") if isinstance(md, dict) else None
    if isinstance(raw_pass, list):
        for item in raw_pass:
            if not isinstance(item, dict):
                continue
            cid = item.get("id")
            req = item.get("requirement")
            if isinstance(cid, str) and cid and isinstance(req, str):
                criteria.append({"id": cid, "requirement": req})
    raw_data = (
        json.dumps(
            _enrich_eval_payload(best_md),
            ensure_ascii=False,
            indent=2,
        )
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

    preset_id = ""
    if isinstance(milestone_row, dict):
        md = milestone_row.get("data")
        node_data = md if isinstance(md, dict) else {}
        raw_preset = node_data.get("presetId")
        if isinstance(raw_preset, str):
            preset_id = raw_preset.strip()

    return {"goal": goal, "raw_data": raw_data, "criteria": criteria, "preset_id": preset_id}


async def evaluate_criterion(
    state: dict[str, Any],
    *,
    structured_llm: Any,
) -> dict[str, Any]:
    goal = str(state.get("goal", ""))
    raw_data = str(state.get("raw_data", ""))
    criterion_id = str(state.get("criterion_id", ""))
    requirement = str(state.get("requirement", ""))

    milestone_data = parse_milestone_data_from_eval_raw(raw_data)
    if milestone_data is not None:
        deterministic = try_ig_text_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_ig_format_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_ig_menu_picker_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_ig_plan_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_ig_profile_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_menu_tagger_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_menu_clusterer_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_post_lineup_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_reel_lineup_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_story_lineup_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_scheduler_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_campaign_brief_deterministic_verdict(requirement, milestone_data)
        if deterministic is None:
            deterministic = try_dates_deterministic_verdict(requirement, milestone_data)
        if deterministic is not None:
            status, reasoning = deterministic
            verdict = CriterionVerdict(status=status, reasoning=reasoning)
        else:
            try:
                verdict = await ainvoke_with_retry(
                    structured_llm,
                    [
                        SystemMessage(content=EVAL_SYSTEM),
                        HumanMessage(content=eval_human_message(goal, raw_data, requirement)),
                    ],
                )
            except LLMInvokeError as exc:
                emit_llm_error_step(exc.code, str(exc))
                raise ValueError(str(exc)) from exc
    else:
        try:
            verdict = await ainvoke_with_retry(
                structured_llm,
                [
                    SystemMessage(content=EVAL_SYSTEM),
                    HumanMessage(content=eval_human_message(goal, raw_data, requirement)),
                ],
            )
        except LLMInvokeError as exc:
            emit_llm_error_step(exc.code, str(exc))
            raise ValueError(str(exc)) from exc
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
    evaluated = state.get("evaluated", [])
    if not evaluated:
        return {}
    await update_milestone_passcriteria_statuses(
        state["milestone_id"],
        state["location_id"],
        [{"id": ev["id"], "status": ev["status"]} for ev in evaluated],
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
    try:
        full = await astream_collect_with_retry(
            llm,
            [SystemMessage(content=SYNTHESIS_SYSTEM), HumanMessage(content=msg)],
        )
    except LLMInvokeError as exc:
        emit_llm_error_step(exc.code, str(exc))
        raise ValueError(str(exc)) from exc
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
        result_node_id=None,
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
) -> list[Send] | Literal["update_criteria"]:
    crit = state.get("criteria") or []
    if not crit:
        return "update_criteria"
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
