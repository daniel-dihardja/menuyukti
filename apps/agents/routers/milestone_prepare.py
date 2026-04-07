"""SSE endpoint: prepare milestone data (e.g. location profile from operating metrics)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Annotated

import httpx
from agents_app.agents.domain.skill_runner.runner import run_skill_events
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()

LOCATION_PROFILE_SKILL_PATH = (
    Path(__file__).resolve().parent.parent / "skills" / "location_profile" / "SKILL.md"
)


class MilestonePrepareBody(BaseModel):
    location_id: int = Field(..., ge=1)


def _sse_line(payload: object) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/milestones/{milestone_id}/prepare")
async def milestone_prepare(
    milestone_id: str,
    body: MilestonePrepareBody,
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StreamingResponse:
    if not x_menuyukti_user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    async def event_stream() -> AsyncIterator[str]:
        try:
            async with httpx.AsyncClient() as client:
                async for payload in run_skill_events(
                    LOCATION_PROFILE_SKILL_PATH,
                    milestone_id,
                    body.location_id,
                    x_menuyukti_user_id,
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
