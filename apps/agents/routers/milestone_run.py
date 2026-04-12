"""SSE endpoint: run LangGraph milestone evaluation (criteria + result node)."""

from __future__ import annotations

from typing import Annotated

import httpx
from agents_app.agents.core.milestone_run.stream import (
    format_sse_line,
    iter_milestone_run_sse_lines,
)
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()


class MilestoneRunBody(BaseModel):
    location_id: int = Field(..., ge=1)
    workflow_id: str | None = Field(
        default=None,
        description="Parent workflow node id — enables reading earlier milestones' Data tabs.",
    )
    data_task: str | None = Field(
        default=None,
        description="Milestone ``data.dataTask`` from the web BFF (authoritative when GraphQL node fetch differs).",
    )


@router.post("/milestones/{milestone_id}/run")
async def milestone_run(
    milestone_id: str,
    body: MilestoneRunBody,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
    traceparent: Annotated[str | None, Header()] = None,
) -> StreamingResponse:
    if not x_menuyukti_user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    tp = traceparent.strip() if traceparent and traceparent.strip() else None

    async def event_stream():
        try:
            async for line in iter_milestone_run_sse_lines(
                client=client,
                milestone_id=milestone_id,
                location_id=body.location_id,
                user_id=x_menuyukti_user_id,
                workflow_id=body.workflow_id,
                bff_data_task=body.data_task,
                traceparent=tp,
            ):
                yield line
        except Exception as e:
            yield format_sse_line({"error": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
