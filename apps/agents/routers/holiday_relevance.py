"""HTTP endpoint: score public-holiday Instagram-story relevance for a location."""

from __future__ import annotations

import logging
from typing import Annotated

import httpx
from agents_app.agents.core.holiday_relevance import (
    HolidayInput,
    HolidayRelevanceItem,
    LocationNotFoundError,
    score_holiday_relevance,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.graphql_base import GraphQLHttpError
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)

router = APIRouter()


class HolidayRelevanceRequest(BaseModel):
    location_id: int = Field(alias="locationId", ge=1)
    holidays: list[HolidayInput] = Field(default_factory=list, max_length=200)
    instructions: str | None = Field(default=None, max_length=2000)

    model_config = {"populate_by_name": True}


class HolidayRelevanceResponse(BaseModel):
    holidays: list[HolidayRelevanceItem]


@router.post(
    "/playbooks/public-holidays/relevance",
    response_model=HolidayRelevanceResponse,
)
async def score_public_holiday_relevance(
    body: HolidayRelevanceRequest,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> HolidayRelevanceResponse:
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    user_id = x_menuyukti_user_id.strip()

    try:
        scored = await score_holiday_relevance(
            client=http_client,
            user_id=user_id,
            location_id=body.location_id,
            holidays=body.holidays,
            reporting_user=user_id,
            operator_instructions=body.instructions,
        )
    except LocationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except GraphQLHttpError as exc:
        _logger.error("holiday_relevance graphql failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMInvokeError as exc:
        _logger.error("holiday_relevance failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        _logger.exception("holiday_relevance unexpected error")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to score holiday relevance: {exc}",
        ) from exc

    return HolidayRelevanceResponse(holidays=scored)
