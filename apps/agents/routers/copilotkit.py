"""Authenticated AG-UI endpoint for CopilotKit → LangGraph advisor chat."""

from __future__ import annotations

from typing import Annotated, Any

import httpx
from ag_ui.core.types import RunAgentInput
from ag_ui.encoder import EventEncoder
from agents_app.agents.core.chat.chat_run_config import resolved_chat_gateway_model
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.agents.core.chat.limits import CHAT_RECURSION_LIMIT
from agents_app.agents.core.copilotkit.agent import MenuyuktiLangGraphAGUIAgent
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

router = APIRouter()

AGENT_NAME = "advisor"


def _header_int(raw: str | None) -> int | None:
    if raw is None or not raw.strip():
        return None
    try:
        return int(raw.strip())
    except ValueError:
        return None


def _normalize_chat_mode(raw: str | None) -> str | None:
    mode = (raw or "").strip() or None
    if mode == "story_image_assistant":
        return "image_assistant"
    return mode


def _build_configurable(
    *,
    user_id: str,
    location_id: int | None,
    analytics_run_id: int | None,
    chat_mode: str | None,
    chat_model: str | None,
    generation_model: str | None,
    image_format: str | None,
    image_quality: str | None,
) -> dict[str, Any]:
    configurable: dict[str, Any] = {
        "user_id": user_id,
        "location_id": location_id,
        # Marks AG-UI / CopilotKit transport so tools can opt into interrupt HITL.
        "transport": "agui",
    }
    if analytics_run_id is not None:
        configurable["analytics_run_id"] = analytics_run_id
    if chat_mode is not None:
        configurable["chat_mode"] = chat_mode
    if chat_model is not None:
        configurable["chat_gateway_model"] = chat_model
    if generation_model is not None:
        configurable["generation_model"] = generation_model.strip() or None
    if image_format is not None:
        configurable["image_format"] = image_format.strip() or None
    if image_quality is not None:
        configurable["image_quality"] = image_quality.strip() or None
    return configurable


@router.get("/copilotkit/advisor/health")
async def advisor_agui_health() -> JSONResponse:
    return JSONResponse({"status": "ok", "agent": {"name": AGENT_NAME}})


@router.post("/copilotkit/advisor")
async def advisor_agui_run(
    input_data: RunAgentInput,
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
    x_menuyukti_location_id: Annotated[str | None, Header(alias="X-Menuyukti-Location-Id")] = None,
    x_menuyukti_analytics_run_id: Annotated[
        str | None, Header(alias="X-Menuyukti-Analytics-Run-Id")
    ] = None,
    x_menuyukti_chat_mode: Annotated[str | None, Header(alias="X-Menuyukti-Chat-Mode")] = None,
    x_menuyukti_chat_model: Annotated[str | None, Header(alias="X-Menuyukti-Chat-Model")] = None,
    x_menuyukti_generation_model: Annotated[
        str | None, Header(alias="X-Menuyukti-Generation-Model")
    ] = None,
    x_menuyukti_image_format: Annotated[str | None, Header(alias="X-Menuyukti-Image-Format")] = None,
    x_menuyukti_image_quality: Annotated[
        str | None, Header(alias="X-Menuyukti-Image-Quality")
    ] = None,
) -> StreamingResponse:
    """Stream AG-UI events for the advisor chat graph (CopilotKit HttpAgent target)."""
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    graph = getattr(request.app.state, "chat_graph", None)
    if graph is None:
        raise HTTPException(status_code=503, detail="Chat graph is not initialized")

    thread_id = (input_data.thread_id or "").strip()
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id (agentThreadId) is required")

    chat_mode = _normalize_chat_mode(x_menuyukti_chat_mode)
    # Validate model allowlist early (raises HTTP 400) before opening the stream.
    try:
        gateway_model = resolved_chat_gateway_model(x_menuyukti_chat_model)
    except HTTPException:
        raise

    configurable = _build_configurable(
        user_id=x_menuyukti_user_id.strip(),
        location_id=_header_int(x_menuyukti_location_id),
        analytics_run_id=_header_int(x_menuyukti_analytics_run_id),
        chat_mode=chat_mode,
        chat_model=gateway_model,
        generation_model=x_menuyukti_generation_model,
        image_format=x_menuyukti_image_format,
        image_quality=x_menuyukti_image_quality,
    )

    agent = MenuyuktiLangGraphAGUIAgent(
        name=AGENT_NAME,
        description="Menuyukti advisor chat agent",
        graph=graph,
        config={
            "configurable": configurable,
            "recursion_limit": CHAT_RECURSION_LIMIT,
        },
    )

    encoder = EventEncoder(accept=request.headers.get("accept") or "")

    async def event_generator():
        # Bind HTTP client inside the stream task (StreamingResponse may run in
        # a different context than the request handler).
        token = chat_http_client_var.set(client)
        try:
            async for event in agent.run(input_data):
                yield encoder.encode(event)
        finally:
            chat_http_client_var.reset(token)

    return StreamingResponse(
        event_generator(),
        media_type=encoder.get_content_type(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
