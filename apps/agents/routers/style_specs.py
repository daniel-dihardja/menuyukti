"""HTTP endpoint: draft a Style Spec from a reference image."""

from __future__ import annotations

import logging
from typing import Annotated, Any

from agents_app.agents.core.chat.allowed_models import is_allowlisted_vision_gateway_model
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.core.style_spec.draft import draft_style_spec_from_image
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)

router = APIRouter()


class StyleSpecDraftRequest(BaseModel):
    image_url: str = Field(min_length=1, max_length=12_000_000)
    intent: str | None = Field(default=None, max_length=2000)
    model: str = Field(min_length=1, max_length=128)


class StyleSpecDraftResponse(BaseModel):
    name: str
    style_spec: dict[str, Any]


def _resolved_vision_gateway_model(raw: str) -> str:
    s = raw.strip()
    if not is_allowlisted_vision_gateway_model(s):
        raise HTTPException(
            status_code=400,
            detail="Model is not allowlisted for vision style draft",
        )
    return s


@router.post("/style-specs/draft-from-image", response_model=StyleSpecDraftResponse)
async def draft_style_spec_from_image_endpoint(
    body: StyleSpecDraftRequest,
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StyleSpecDraftResponse:
    if not x_menuyukti_user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    image_url = body.image_url.strip()
    if not (
        image_url.startswith("data:image/")
        or image_url.startswith("https://")
        or image_url.startswith("http://")
    ):
        raise HTTPException(
            status_code=400,
            detail="image_url must be a data URL or http(s) URL",
        )

    gateway_model = _resolved_vision_gateway_model(body.model)

    try:
        name, spec = await draft_style_spec_from_image(
            image_url=image_url,
            intent=body.intent,
            gateway_model_id=gateway_model,
            reporting_user=x_menuyukti_user_id.strip(),
        )
    except LLMInvokeError as exc:
        _logger.error("style_spec draft failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        _logger.exception("style_spec draft unexpected error")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to draft style spec: {exc}",
        ) from exc

    return StyleSpecDraftResponse(
        name=name,
        style_spec=spec.model_dump(mode="json", exclude_none=True),
    )
