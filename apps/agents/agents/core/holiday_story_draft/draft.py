"""Draft an Instagram story for one public holiday via structured LLM."""

from __future__ import annotations

import logging

import httpx
from agents_app.agents.core.ai_usage_client import record_ai_usage_event
from agents_app.agents.core.holiday_story_draft.models import (
    HolidayInput,
    StoryDraftItem,
    StoryDraftResult,
)
from agents_app.agents.core.holiday_story_draft.prompts import (
    STORY_DRAFT_SYSTEM,
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


async def draft_holiday_story(
    *,
    client: httpx.AsyncClient,
    user_id: str,
    location_id: int,
    holiday: HolidayInput,
    reporting_user: str | None = None,
    operator_instructions: str | None = None,
) -> StoryDraftItem:
    """
    Draft Instagram story caption + visual brief for one holiday.

    Loads venue context from GraphQL, then runs a structured LLM call.
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
    holiday_dict = holiday.model_dump(by_alias=True, exclude_none=True)
    user_text = story_draft_user_text(
        location_markdown=location_markdown,
        holiday=holiday_dict,
        operator_instructions=operator_instructions,
    )

    llm = get_llm_structured(
        reporting_user=reporting_user or user_id,
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

    if reporting_user or user_id:
        try:
            await record_ai_usage_event(
                client,
                user_id=reporting_user or user_id,
                provider="ai_gateway",
                feature="holiday_story_draft",
                status="succeeded",
                units=1,
                metadata={
                    "holiday_id": holiday.id,
                    "has_operator_instructions": bool(
                        operator_instructions and operator_instructions.strip()
                    ),
                },
            )
        except Exception:  # noqa: BLE001
            _logger.warning("holiday_story_draft usage record failed", exc_info=True)

    return StoryDraftItem(
        id=holiday.id,
        date=holiday.date,
        name=holiday.name,
        result=result,
    )
