"""SSE endpoint: prepare milestone data (e.g. location profile from operating metrics)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from agents_app.agents.domain.location_profile.graph import build_location_profile_graph
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()


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
        initial = {
            "milestone_id": milestone_id,
            "location_id": body.location_id,
            "user_id": x_menuyukti_user_id,
            "profile_data": {},
            "generated_text": "",
            "milestonedata_id": None,
        }
        final_state: dict | None = None
        try:
            async with httpx.AsyncClient() as client:
                graph = build_location_profile_graph(client)
                async for mode, chunk in graph.astream(
                    initial,
                    stream_mode=["custom", "values"],
                ):
                    if mode == "custom":
                        yield _sse_line(chunk)
                    elif mode == "values" and isinstance(chunk, dict):
                        final_state = chunk
            if isinstance(final_state, dict):
                preview = str(final_state.get("generated_text") or "")
                yield _sse_line(
                    {
                        "done": True,
                        "dataPreview": preview,
                        "milestonedataId": str(final_state.get("milestonedata_id") or ""),
                    }
                )
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
