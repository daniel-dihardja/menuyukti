"""SSE endpoint: prepare milestone data (e.g. location profile from operating metrics)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Annotated, Literal

import httpx
from agent_skills import get_skill_path
from agents_app.agents.domain.skill_runner.runner import run_skill_events
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()

PrepareDataTask = Literal[
    "location_profile",
    "instagram_campaign_schedule",
    "restaurant_brand_brief",
    "social_campaign_calendar",
    "social_caption_batch",
    "visual_creative_brief",
]


class MilestonePrepareBody(BaseModel):
    location_id: int = Field(..., ge=1)
    data_task: PrepareDataTask = Field(
        default="restaurant_brand_brief",
        description="Milestone data task / skill id (folder name under agent_skills.skills).",
    )
    workflow_id: str = Field(
        default="",
        description="Workflow root node id for milestone.prior_data prefetch (same as URL segment).",
    )


def _sse_line(payload: object) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/milestones/{milestone_id}/prepare")
async def milestone_prepare(
    milestone_id: str,
    body: MilestonePrepareBody,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StreamingResponse:
    if not x_menuyukti_user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    async def event_stream() -> AsyncIterator[str]:
        try:
            skill_path = get_skill_path(body.data_task)
            async for payload in run_skill_events(
                skill_path,
                milestone_id,
                body.location_id,
                x_menuyukti_user_id,
                workflow_id=body.workflow_id.strip(),
                client=client,
            ):
                yield _sse_line(payload)
        except Exception as e:
            yield _sse_line({"error": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
