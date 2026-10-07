"""Draft a visual brief for one public holiday via structured LLM."""

from __future__ import annotations

import logging

import httpx
from agents_app.agents.core.ai_usage_client import record_ai_usage_event
from agents_app.agents.core.holiday_story_draft.models import HolidayInput, StoryDraftResult
from agents_app.agents.core.holiday_visual_brief.models import (
    StyleAnalysisInput,
    VisualBriefItem,
    VisualBriefResult,
)
from agents_app.agents.core.holiday_visual_brief.prompts import (
    VISUAL_BRIEF_SYSTEM,
    normalize_feedback,
    visual_brief_user_text,
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


async def draft_holiday_visual_brief(
    *,
    client: httpx.AsyncClient,
    user_id: str,
    location_id: int,
    holiday: HolidayInput,
    story_draft: StoryDraftResult,
    style_analysis: StyleAnalysisInput,
    reporting_user: str | None = None,
    operator_instructions: str | None = None,
    previous_result: VisualBriefResult | None = None,
    feedback: str | None = None,
) -> VisualBriefItem:
    """
    Draft a visual brief for one holiday Instagram story image.

    Loads venue context from GraphQL, then runs a structured LLM call.
    When ``previous_result`` and ``feedback`` are both set, revises the prior brief.
    """
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

    holiday_dict = holiday.model_dump(by_alias=True, exclude_none=True)
    previous_dict = (
        previous_result.model_dump(by_alias=True) if previous_result is not None else None
    )
    revision_feedback = normalize_feedback(feedback)
    is_revision = previous_dict is not None and revision_feedback is not None
    user_text = visual_brief_user_text(
        location_markdown=location_markdown,
        holiday=holiday_dict,
        story_caption=story_draft.caption,
        style_analysis=style_analysis.model_dump(by_alias=True),
        operator_instructions=operator_instructions,
        previous_result=previous_dict if is_revision else None,
        feedback=revision_feedback if is_revision else None,
    )

    llm = get_llm_structured(
        reporting_user=usage_user,
        reporting_tags=["feature:holiday-visual-brief"],
    )
    try:
        result = await structured_ainvoke_with_retry(
            llm,
            VisualBriefResult,
            [
                SystemMessage(content=VISUAL_BRIEF_SYSTEM),
                HumanMessage(content=user_text),
            ],
        )
    except LLMInvokeError:
        raise
    except Exception as exc:
        _logger.exception("holiday_visual_brief LLM call failed")
        raise LLMInvokeError(
            f"LLM_UPSTREAM: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    if usage_user:
        try:
            await record_ai_usage_event(
                client,
                user_id=usage_user,
                provider="ai_gateway",
                feature="holiday_visual_brief",
                status="succeeded",
                units=1,
                metadata={
                    "holiday_id": holiday.id,
                    "has_operator_instructions": bool(
                        operator_instructions and operator_instructions.strip()
                    ),
                    "is_revision": is_revision,
                },
            )
        except Exception:  # noqa: BLE001
            _logger.warning("holiday_visual_brief usage record failed", exc_info=True)

    return VisualBriefItem(
        id=holiday.id,
        date=holiday.date,
        name=holiday.name,
        result=result,
    )
