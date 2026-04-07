"""SSE endpoint: run LangGraph milestone evaluation (criteria + result node)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Annotated

import httpx
from agents_app.agents.core.milestone_eval.graph import build_milestone_eval_graph
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()


class MilestoneRunBody(BaseModel):
    location_id: int = Field(..., ge=1)


def _sse_line(payload: object) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@router.post("/milestones/{milestone_id}/run")
async def milestone_run(
    milestone_id: str,
    body: MilestoneRunBody,
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> StreamingResponse:
    if not x_menuyukti_user_id:
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    async def event_stream() -> AsyncIterator[str]:
        initial = {
            "milestone_id": milestone_id,
            "location_id": body.location_id,
            "user_id": x_menuyukti_user_id,
            "goal": "",
            "raw_data": "",
            "criteria": [],
            "evaluated": [],
            "result_summary": "",
            "result_node_id": None,
        }
        final_state: dict | None = None
        try:
            async with httpx.AsyncClient() as client:
                graph = build_milestone_eval_graph(client)
                async for mode, chunk in graph.astream(
                    initial,
                    stream_mode=["custom", "values"],
                ):
                    if mode == "custom":
                        yield _sse_line(chunk)
                    elif mode == "values" and isinstance(chunk, dict):
                        final_state = chunk
            if isinstance(final_state, dict):
                crit = final_state.get("evaluated", [])
                criteria_payload: list[dict[str, str | None]] = []
                if isinstance(crit, list):
                    for e in crit:
                        if isinstance(e, dict):
                            criteria_payload.append(
                                {
                                    "id": str(e.get("id", "")),
                                    "status": str(e.get("status", "")),
                                }
                            )
                yield _sse_line(
                    {
                        "done": True,
                        "resultId": str(final_state.get("result_node_id") or ""),
                        "summary": str(final_state.get("result_summary") or ""),
                        "criteria": criteria_payload,
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
