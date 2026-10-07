"""HTTP endpoint: draft a visual brief for one public holiday."""

from __future__ import annotations

import logging
from typing import Annotated, Self

import httpx
from agents_app.agents.core.holiday_story_draft.models import HolidayInput, StoryDraftResult
from agents_app.agents.core.holiday_visual_brief import (
    LocationNotFoundError,
    StyleAnalysisInput,
    VisualBriefItem,
    VisualBriefResult,
    draft_holiday_visual_brief,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.graphql_base import GraphQLHttpError
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, model_validator

_logger = logging.getLogger(__name__)

router = APIRouter()


class HolidayVisualBriefRequest(BaseModel):
    location_id: int = Field(alias="locationId", ge=1)
    holiday: HolidayInput
    story_draft: StoryDraftResult = Field(alias="storyDraft")
    style_analysis: StyleAnalysisInput = Field(alias="styleAnalysis")
    instructions: str | None = Field(default=None, max_length=2000)
    previous_result: VisualBriefResult | None = Field(default=None, alias="previousResult")
    feedback: str | None = Field(default=None, max_length=1000)

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def revision_rules(self) -> Self:
        has_prev = self.previous_result is not None
        has_feedback = self.feedback is not None and bool(self.feedback.strip())
        if has_prev != has_feedback:
            raise ValueError(
                "previousResult and feedback must both be provided for a revision, "
                "or both omitted for a fresh brief"
            )
        if self.feedback is not None:
            self.feedback = self.feedback.strip() or None
        return self


@router.post(
    "/playbooks/public-holidays/visual-brief",
    response_model=VisualBriefItem,
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
async def draft_public_holiday_visual_brief(
    body: HolidayVisualBriefRequest,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> VisualBriefItem:
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    user_id = x_menuyukti_user_id.strip()

    try:
        return await draft_holiday_visual_brief(
            client=http_client,
            user_id=user_id,
            location_id=body.location_id,
            holiday=body.holiday,
            story_draft=body.story_draft,
            style_analysis=body.style_analysis,
            reporting_user=user_id,
            operator_instructions=body.instructions,
            previous_result=body.previous_result,
            feedback=body.feedback,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LocationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GraphQLHttpError as exc:
        _logger.error("holiday_visual_brief graphql failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMInvokeError as exc:
        _logger.error("holiday_visual_brief failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        _logger.exception("holiday_visual_brief unexpected error")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to draft holiday visual brief: {exc}",
        ) from exc
