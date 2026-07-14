"""SSE endpoint: run LangGraph milestone evaluation (criteria + result node)."""

from __future__ import annotations

from typing import Annotated, Any

import httpx
from agents_app.agents.core.chat.allowed_models import is_allowlisted_chat_gateway_model
from agents_app.agents.core.milestone_run.stream import (
    format_sse_line,
    iter_milestone_run_sse_lines,
)
from agents_app.agents.errors import structured_error_payload
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()


def _resolved_milestone_run_gateway_model(raw: str | None) -> str | None:
    if raw is None:
        return None
    s = raw.strip()
    if not s:
        return None
    if not is_allowlisted_chat_gateway_model(s):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported chat model: {s}. Use a gateway id from the app model list.",
        )
    return s


class MilestoneRunBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    location_id: int = Field(..., ge=1)
    workflow_id: str | None = Field(
        default=None,
        description="Parent workflow node id — enables reading earlier milestones' data (JSON).",
    )
    goal: str | None = Field(
        default=None,
        description="Optional goal override from the web milestone editor.",
    )
    milestone_input: dict[str, Any] | None = Field(
        default=None,
        description="Optional typed milestone input payload (preset specific).",
    )
    milestone_data: dict[str, Any] | list[Any] | None = Field(
        default=None,
        description="Ignored by the run graph (milestone JSON is output-only; not fed to generation LLMs).",
    )
    chat_model: str | None = Field(
        default=None,
        max_length=120,
        alias="model",
        description="Vercel AI Gateway id for generation and eval; must be in the chat allowlist.",
    )
    analytics_run_id: str | None = Field(
        default=None,
        description="Workflow-pinned analytics run id from workflow.data.analyticsRunId.",
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
    gateway_model = _resolved_milestone_run_gateway_model(body.chat_model)

    async def event_stream():
        try:
            async for line in iter_milestone_run_sse_lines(
                client=client,
                milestone_id=milestone_id,
                location_id=body.location_id,
                user_id=x_menuyukti_user_id,
                workflow_id=body.workflow_id,
                goal=body.goal,
                milestone_input=body.milestone_input,
                milestone_data=body.milestone_data,
                traceparent=tp,
                chat_gateway_model=gateway_model,
                analytics_run_id=body.analytics_run_id,
            ):
                yield line
        except Exception as e:
            yield format_sse_line(structured_error_payload(e))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
