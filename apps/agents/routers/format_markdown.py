"""
Platform-level Markdown formatting HTTP endpoint.

Preset-driven LLM rewrite for arbitrary UI (campaign milestone fields are one consumer).
Not a domain graph or milestone-specific workflow.
"""

from agents_app.agents.core.format_markdown import UnknownPresetError, format_markdown
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class FormatMarkdownRequest(BaseModel):
    content: str = Field(default="", max_length=200_000)
    preset: str = Field(min_length=1, max_length=128)


class FormatMarkdownResponse(BaseModel):
    formatted: str


@router.post("/format-markdown", response_model=FormatMarkdownResponse)
async def format_markdown_endpoint(body: FormatMarkdownRequest) -> FormatMarkdownResponse:
    """Format ``content`` as Markdown using the system rules for ``preset``."""
    try:
        formatted = await format_markdown(content=body.content, preset=body.preset)
    except UnknownPresetError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return FormatMarkdownResponse(formatted=formatted)
