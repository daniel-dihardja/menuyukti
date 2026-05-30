"""Reflection loop nodes: quality critique and bounded revision before persist."""

from __future__ import annotations

import asyncio
import json
from typing import Any, Literal

from agents_app.agents.core.campaign_brief.objective import normalize_campaign_objective
from agents_app.agents.core.llm_invoke import LLMInvokeError, emit_llm_error_step
from agents_app.agents.core.milestone_run.campaign_brief.nodes import CampaignBriefDraftOutput
from agents_app.agents.core.milestone_run.campaign_brief.reflect_prompts import (
    REFLECT_QUALITY_SYSTEM,
    REFLECT_REVISE_SYSTEM,
    reflect_quality_human_message,
    reflect_revise_human_message,
)
from agents_app.agents.core.milestone_run.campaign_brief.state import (
    CampaignBriefState,
    ReflectionCritique,
)
from agents_app.agents.core.milestone_run.llm_from_run_config import (
    structured_ainvoke_from_run_config,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from pydantic import BaseModel, Field


class QualityVerdict(BaseModel):
    """Structured quality assessment for one pass criterion."""

    quality_pass: bool = Field(description="True when content quality meets the requirement intent")
    feedback: str = Field(description="One short sentence explaining pass or what to improve")


def route_after_generate(
    state: CampaignBriefState,
) -> Literal["reflect_critique", "persist_result"]:
    if bool(state.get("reflection_enabled")):
        return "reflect_critique"
    return "persist_result"


def route_after_reflect(state: CampaignBriefState) -> Literal["reflect_critique", "persist_result"]:
    critiques = state.get("reflection_critiques") or []
    failures = [row for row in critiques if not row.get("quality_pass")]
    iteration = int(state.get("reflection_iteration") or 0)
    max_revisions = int(state.get("reflection_max_revisions") or 0)
    if failures and iteration < max_revisions:
        return "reflect_critique"
    return "persist_result"


def _draft_json(state: CampaignBriefState) -> str:
    payload = state.get("generated_output") or {}
    return json.dumps(payload, ensure_ascii=False, indent=2)


async def _critique_one(
    *,
    goal: str,
    signal_markdown: str,
    draft_json: str,
    criterion_id: str,
    requirement: str,
    iteration: int,
) -> ReflectionCritique:
    try:
        verdict = await structured_ainvoke_from_run_config(
            QualityVerdict,
            [
                SystemMessage(content=REFLECT_QUALITY_SYSTEM),
                HumanMessage(
                    content=reflect_quality_human_message(
                        goal, signal_markdown, draft_json, requirement
                    )
                ),
            ],
        )
    except LLMInvokeError as exc:
        emit_llm_error_step(exc.code, str(exc))
        raise ValueError(str(exc)) from exc
    writer = get_stream_writer()
    writer(
        {
            "step": "reflect_critique",
            "iteration": iteration,
            "id": criterion_id,
            "quality_pass": verdict.quality_pass,
            "feedback": verdict.feedback,
        }
    )
    return {
        "id": criterion_id,
        "requirement": requirement,
        "feedback": verdict.feedback,
        "quality_pass": verdict.quality_pass,
    }


async def reflect_critique(state: CampaignBriefState) -> dict[str, Any]:
    """Run parallel quality critique against each pass criterion."""
    iteration = int(state.get("reflection_iteration") or 0)
    critique_pass = iteration + 1
    writer = get_stream_writer()
    writer({"step": "reflect_critique", "iteration": critique_pass})

    criteria = state.get("criteria") or []
    eligible = [
        row
        for row in criteria
        if isinstance(row, dict) and row.get("id") and row.get("requirement")
    ]
    if not criteria:
        return {"reflection_critiques": []}

    goal = str(state.get("goal", ""))
    signal_markdown = str(state.get("signal_markdown", ""))
    draft_json = _draft_json(state)

    tasks = [
        _critique_one(
            goal=goal,
            signal_markdown=signal_markdown,
            draft_json=draft_json,
            criterion_id=str(row.get("id", "")),
            requirement=str(row.get("requirement", "")),
            iteration=critique_pass,
        )
        for row in eligible
    ]
    critiques = await asyncio.gather(*tasks) if tasks else []
    if critiques:
        writer(
            {
                "step": "reflect_critique_summary",
                "iteration": critique_pass,
                "critiques": [
                    {
                        "id": row["id"],
                        "quality_pass": row["quality_pass"],
                        "feedback": row["feedback"],
                    }
                    for row in critiques
                    if isinstance(row, dict) and row.get("id")
                ],
            }
        )
    return {"reflection_critiques": list(critiques)}


async def reflect_revise(state: CampaignBriefState) -> dict[str, Any]:
    """Revise draft when quality critique found failures and revisions remain."""
    critiques = state.get("reflection_critiques") or []
    failures = [row for row in critiques if isinstance(row, dict) and not row.get("quality_pass")]
    iteration = int(state.get("reflection_iteration") or 0)
    max_revisions = int(state.get("reflection_max_revisions") or 0)

    if not failures or iteration >= max_revisions:
        return {}

    writer = get_stream_writer()
    writer(
        {
            "step": "reflect_revise",
            "iteration": iteration + 1,
            "addressing": [
                {"id": str(row.get("id", "")), "feedback": str(row.get("feedback", "")).strip()}
                for row in failures
                if isinstance(row, dict) and row.get("id")
            ],
        }
    )

    try:
        revised = await structured_ainvoke_from_run_config(
            CampaignBriefDraftOutput,
            [
                SystemMessage(content=REFLECT_REVISE_SYSTEM),
                HumanMessage(
                    content=reflect_revise_human_message(
                        str(state.get("goal", "")),
                        str(state.get("signal_markdown", "")),
                        _draft_json(state),
                        failures,
                    )
                ),
            ],
        )
    except LLMInvokeError as exc:
        emit_llm_error_step(exc.code, str(exc))
        raise ValueError(str(exc)) from exc
    candidate = revised.model_dump(exclude_none=True)
    if not isinstance(candidate, dict) or not candidate.get("campaignObjective"):
        return {"reflection_iteration": iteration + 1}

    objective = str(candidate.get("campaignObjective") or "").strip()
    if objective:
        candidate["campaignObjective"] = normalize_campaign_objective(objective)

    return {
        "generated_output": candidate,
        "reflection_iteration": iteration + 1,
    }
