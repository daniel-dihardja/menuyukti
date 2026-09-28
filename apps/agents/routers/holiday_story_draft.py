"""HTTP endpoint: draft an Instagram story for one public holiday."""

from __future__ import annotations

import logging
from typing import Annotated, Self

import httpx
from agents_app.agents.core.holiday_story_draft import (
    HolidayInput,
    LocationNotFoundError,
    StoryDraftItem,
    StoryDraftResult,
    draft_holiday_story,
)
from agents_app.agents.core.holiday_story_draft.models import CritiqueConfig
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.graphql_base import GraphQLHttpError
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, model_validator

_logger = logging.getLogger(__name__)

router = APIRouter()


class HolidayStoryDraftRequest(BaseModel):
    location_id: int = Field(alias="locationId", ge=1)
    holiday: HolidayInput
    instructions: str | None = Field(default=None, max_length=2000)
    previous_result: StoryDraftResult | None = Field(default=None, alias="previousResult")
    feedback: str | None = Field(default=None, max_length=1000)
    critique: CritiqueConfig | None = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def revision_and_critique_rules(self) -> Self:
        has_prev = self.previous_result is not None
        has_feedback = self.feedback is not None and bool(self.feedback.strip())
        if has_prev != has_feedback:
            raise ValueError(
                "previousResult and feedback must both be provided for a revision, "
                "or both omitted for a fresh draft"
            )
        if self.feedback is not None:
            self.feedback = self.feedback.strip() or None
        if self.critique is not None and (has_prev or has_feedback):
            raise ValueError(
                "critique cannot be combined with previousResult/feedback; "
                "manual revise must omit critique"
            )
        return self


@router.post(
    "/playbooks/public-holidays/draft-story",
    response_model=StoryDraftItem,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
async def draft_public_holiday_story(
    body: HolidayStoryDraftRequest,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StoryDraftItem:
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    user_id = x_menuyukti_user_id.strip()

    try:
        return await draft_holiday_story(
            client=http_client,
            user_id=user_id,
            location_id=body.location_id,
            holiday=body.holiday,
            reporting_user=user_id,
            operator_instructions=body.instructions,
            previous_result=body.previous_result,
            feedback=body.feedback,
            critique=body.critique,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LocationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GraphQLHttpError as exc:
        _logger.error("holiday_story_draft graphql failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMInvokeError as exc:
        _logger.error("holiday_story_draft failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        _logger.exception("holiday_story_draft unexpected error")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to draft holiday story: {exc}",
        ) from exc
