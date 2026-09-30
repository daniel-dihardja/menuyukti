"""Draft an Instagram story for one public holiday via structured LLM."""

from __future__ import annotations

import logging

import httpx
from agents_app.agents.core.ai_usage_client import record_ai_usage_event
from agents_app.agents.core.holiday_story_draft.models import (
    CritiqueConfig,
    CritiqueRound,
    CritiqueSummary,
    CritiqueVerdict,
    CritiqueVerdictLlm,
    HolidayInput,
    StoryDraftItem,
    StoryDraftResult,
)
from agents_app.agents.core.holiday_story_draft.prompts import (
    STORY_CRITIQUE_SYSTEM,
    STORY_DRAFT_SYSTEM,
    normalize_feedback,
    story_critique_user_text,
    story_draft_user_text,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError, structured_ainvoke_with_retry
from agents_app.agents.core.location_page_format import format_location_page_markdown
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import LOCATION_QUERY
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage

_logger = logging.getLogger(__name__)


class LocationNotFoundError(LookupError):
    """Raised when the location is missing or not accessible for the user."""


async def _invoke_story_draft(
    *,
    location_markdown: str,
    holiday: HolidayInput,
    operator_instructions: str | None,
    previous_result: StoryDraftResult | None,
    feedback: str | None,
    reporting_user: str | None,
    client: httpx.AsyncClient,
    holiday_id: str,
) -> StoryDraftResult:
    holiday_dict = holiday.model_dump(by_alias=True, exclude_none=True)
    previous_dict = (
        previous_result.model_dump(by_alias=True) if previous_result is not None else None
    )
    revision_feedback = normalize_feedback(feedback)
    is_revision = previous_dict is not None and revision_feedback is not None
    user_text = story_draft_user_text(
        location_markdown=location_markdown,
        holiday=holiday_dict,
        operator_instructions=operator_instructions,
        previous_result=previous_dict if is_revision else None,
        feedback=revision_feedback if is_revision else None,
    )

    llm = get_llm_structured(
        reporting_user=reporting_user,
        reporting_tags=["feature:holiday-story-draft"],
    )
    try:
        result = await structured_ainvoke_with_retry(
            llm,
            StoryDraftResult,
            [
                SystemMessage(content=STORY_DRAFT_SYSTEM),
                HumanMessage(content=user_text),
            ],
        )
    except LLMInvokeError:
        raise
    except Exception as exc:
        _logger.exception("holiday_story_draft LLM call failed")
        raise LLMInvokeError(
            f"LLM_UPSTREAM: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    if reporting_user:
        try:
            await record_ai_usage_event(
                client,
                user_id=reporting_user,
                provider="ai_gateway",
                feature="holiday_story_draft",
                status="succeeded",
                units=1,
                metadata={
                    "holiday_id": holiday_id,
                    "has_operator_instructions": bool(
                        operator_instructions and operator_instructions.strip()
                    ),
                    "is_revision": is_revision,
                },
            )
        except Exception:  # noqa: BLE001
            _logger.warning("holiday_story_draft usage record failed", exc_info=True)

    return result


async def _invoke_story_critique(
    *,
    location_markdown: str,
    holiday: HolidayInput,
    draft: StoryDraftResult,
    critique: CritiqueConfig,
    reporting_user: str | None,
    client: httpx.AsyncClient,
    holiday_id: str,
    round_index: int,
) -> CritiqueVerdict:
    holiday_dict = holiday.model_dump(by_alias=True, exclude_none=True)
    draft_dict = draft.model_dump(by_alias=True)
    user_text = story_critique_user_text(
        location_markdown=location_markdown,
        holiday=holiday_dict,
        draft=draft_dict,
        critique_prompt=critique.prompt,
        min_score=critique.min_score,
    )

    llm = get_llm_structured(
        reporting_user=reporting_user,
        reporting_tags=["feature:holiday-story-critique"],
    )
    try:
        raw = await structured_ainvoke_with_retry(
            llm,
            CritiqueVerdictLlm,
            [
                SystemMessage(content=STORY_CRITIQUE_SYSTEM),
                HumanMessage(content=user_text),
            ],
        )
    except LLMInvokeError:
        raise
    except Exception as exc:
        _logger.exception("holiday_story_critique LLM call failed")
        raise LLMInvokeError(
            f"LLM_UPSTREAM: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    passed = raw.score >= critique.min_score
    verdict = CritiqueVerdict(score=raw.score, feedback=raw.feedback, passed=passed)

    if reporting_user:
        try:
            await record_ai_usage_event(
                client,
                user_id=reporting_user,
                provider="ai_gateway",
                feature="holiday_story_critique",
                status="succeeded",
                units=1,
                metadata={
                    "holiday_id": holiday_id,
                    "round": round_index,
                    "score": verdict.score,
                    "passed": verdict.passed,
                    "min_score": critique.min_score,
                },
            )
        except Exception:  # noqa: BLE001
            _logger.warning("holiday_story_critique usage record failed", exc_info=True)

    return verdict


async def draft_holiday_story(
    *,
    client: httpx.AsyncClient,
    user_id: str,
    location_id: int,
    holiday: HolidayInput,
    reporting_user: str | None = None,
    operator_instructions: str | None = None,
    previous_result: StoryDraftResult | None = None,
    feedback: str | None = None,
    critique: CritiqueConfig | None = None,
) -> StoryDraftItem:
    """
    Draft Instagram story caption for one holiday.

    Loads venue context from GraphQL, then runs a structured LLM call.
    When ``previous_result`` and ``feedback`` are both set, revises the prior draft.
    When ``critique`` is set, runs generate → critique → revise until the score
    reaches ``min_score`` or ``max_iterations`` critiques are exhausted.
    """
    if critique is not None and (previous_result is not None or feedback is not None):
        raise ValueError(
            "critique cannot be combined with previousResult/feedback; "
            "manual revise must omit critique"
        )

    loc_data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id)},
        user_id,
    )
    raw_loc = loc_data.get("location")
    if not isinstance(raw_loc, dict):
        raise LocationNotFoundError("Location not found or access denied")

    location_markdown = format_location_page_markdown(raw_loc)
    usage_user = reporting_user or user_id

    current = await _invoke_story_draft(
        location_markdown=location_markdown,
        holiday=holiday,
        operator_instructions=operator_instructions,
        previous_result=previous_result,
        feedback=feedback,
        reporting_user=usage_user,
        client=client,
        holiday_id=holiday.id,
    )

    if critique is None:
        return StoryDraftItem(
            id=holiday.id,
            date=holiday.date,
            name=holiday.name,
            result=current,
        )

    rounds: list[CritiqueRound] = []
    for round_index in range(1, critique.max_iterations + 1):
        verdict = await _invoke_story_critique(
            location_markdown=location_markdown,
            holiday=holiday,
            draft=current,
            critique=critique,
            reporting_user=usage_user,
            client=client,
            holiday_id=holiday.id,
            round_index=round_index,
        )
        rounds.append(CritiqueRound(draft=current, verdict=verdict))
        if verdict.passed:
            break
        if round_index >= critique.max_iterations:
            break
        current = await _invoke_story_draft(
            location_markdown=location_markdown,
            holiday=holiday,
            operator_instructions=operator_instructions,
            previous_result=current,
            feedback=verdict.feedback,
            reporting_user=usage_user,
            client=client,
            holiday_id=holiday.id,
        )

    last = rounds[-1]
    summary = CritiqueSummary(
        rounds=rounds,
        final_score=last.verdict.score,
        passed=last.verdict.passed,
    )
    return StoryDraftItem(
        id=holiday.id,
        date=holiday.date,
        name=holiday.name,
        result=current,
        critique=summary,
    )
