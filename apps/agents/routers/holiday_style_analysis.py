"""HTTP endpoint: analyze a style reference for holiday artwork."""

from __future__ import annotations

import logging
from typing import Annotated

import httpx
from agents_app.agents.core.holiday_style_analysis import (
    StyleAnalysisResult,
    analyze_holiday_style,
)
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)

router = APIRouter()


class HolidayStyleAnalysisRequest(BaseModel):
    image_url: str = Field(alias="imageUrl", min_length=1, max_length=12_000_000)
    instructions: str | None = Field(default=None, max_length=2000)
    model: str | None = Field(default=None, max_length=128)

    model_config = {"populate_by_name": True}


@router.post(
    "/playbooks/public-holidays/analyze-style",
    response_model=StyleAnalysisResult,
    response_model_by_alias=True,
)
async def analyze_public_holiday_style(
    body: HolidayStyleAnalysisRequest,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StyleAnalysisResult:
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    user_id = x_menuyukti_user_id.strip()
    image_url = body.image_url.strip()
    if not (
        image_url.startswith("data:image/")
        or image_url.startswith("https://")
        or image_url.startswith("http://")
    ):
        raise HTTPException(
            status_code=400,
            detail="imageUrl must be a data URL or http(s) URL",
        )

    try:
        return await analyze_holiday_style(
            image_url=image_url,
            operator_instructions=body.instructions,
            gateway_model_id=body.model,
            reporting_user=user_id,
            client=http_client,
        )
    except LLMInvokeError as exc:
        _logger.error("holiday_style_analysis failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        _logger.exception("holiday_style_analysis unexpected error")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to analyze holiday style: {exc}",
        ) from exc
