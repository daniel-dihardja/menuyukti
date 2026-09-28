"""HTTP endpoint: draft an Instagram story for one public holiday."""

from __future__ import annotations

import logging
from typing import Annotated

import httpx
from agents_app.agents.core.holiday_story_draft import (
    HolidayInput,
    LocationNotFoundError,
    StoryDraftItem,
    draft_holiday_story,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.graphql_base import GraphQLHttpError
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)

router = APIRouter()


class HolidayStoryDraftRequest(BaseModel):
    location_id: int = Field(alias="locationId", ge=1)
    holiday: HolidayInput
    instructions: str | None = Field(default=None, max_length=2000)

    model_config = {"populate_by_name": True}


@router.post(
    "/playbooks/public-holidays/draft-story",
    response_model=StoryDraftItem,
    response_model_by_alias=True,
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
        )
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
