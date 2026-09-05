"""
Platform-level Markdown formatting HTTP endpoint.

Preset-driven LLM rewrite for arbitrary UI surfaces.
"""

import logging
from typing import Annotated

from agents_app.agents.core.format_markdown import UnknownPresetError, format_markdown
from agents_app.agents.core.llm_invoke import LLMInvokeError
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)

router = APIRouter()


class FormatMarkdownRequest(BaseModel):
    content: str = Field(default="", max_length=200_000)
    preset: str = Field(min_length=1, max_length=128)


class FormatMarkdownResponse(BaseModel):
    formatted: str


@router.post("/format-markdown", response_model=FormatMarkdownResponse)
async def format_markdown_endpoint(
    body: FormatMarkdownRequest,
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> FormatMarkdownResponse:
    """Format ``content`` as Markdown using the system rules for ``preset``."""
    reporting_user = x_menuyukti_user_id.strip() if x_menuyukti_user_id else None
    try:
        formatted = await format_markdown(
            content=body.content,
            preset=body.preset,
            reporting_user=reporting_user,
        )
    except UnknownPresetError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except LLMInvokeError as exc:
        _logger.error("format_markdown failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return FormatMarkdownResponse(formatted=formatted)
