"""FastAPI route: OpenAI ChatKit protocol → LangGraph advisor chat."""

from __future__ import annotations

from typing import Annotated, Any

import httpx
from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

router = APIRouter()


def _header_int(raw: str | None) -> int | None:
    if raw is None or not raw.strip():
        return None
    try:
        return int(raw.strip())
    except ValueError:
        return None


@router.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
    x_chatkit_agent_thread_id: Annotated[
        str | None, Header(alias="X-Chatkit-Agent-Thread-Id")
    ] = None,
    x_chatkit_location_id: Annotated[str | None, Header(alias="X-Chatkit-Location-Id")] = None,
    x_chatkit_analytics_run_id: Annotated[
        str | None, Header(alias="X-Chatkit-Analytics-Run-Id")
    ] = None,
    x_chatkit_chat_mode: Annotated[str | None, Header(alias="X-Chatkit-Chat-Mode")] = None,
    x_chatkit_chat_model: Annotated[str | None, Header(alias="X-Chatkit-Chat-Model")] = None,
    x_chatkit_generation_model: Annotated[
        str | None, Header(alias="X-Chatkit-Generation-Model")
    ] = None,
    x_chatkit_image_format: Annotated[str | None, Header(alias="X-Chatkit-Image-Format")] = None,
    x_chatkit_image_quality: Annotated[str | None, Header(alias="X-Chatkit-Image-Quality")] = None,
) -> Response:
    """Proxy ChatKit protocol requests (JSON or SSE) with advisor shell context."""
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    server = getattr(request.app.state, "chatkit_server", None)
    graph = getattr(request.app.state, "chat_graph", None)
    if server is None or graph is None:
        raise HTTPException(status_code=503, detail="ChatKit is not initialized")

    agent_thread_id = (x_chatkit_agent_thread_id or "").strip()
    if not agent_thread_id:
        raise HTTPException(status_code=400, detail="X-Chatkit-Agent-Thread-Id is required")

    context = ChatKitRequestContext(
        user_id=x_menuyukti_user_id.strip(),
        agent_thread_id=agent_thread_id,
        location_id=_header_int(x_chatkit_location_id),
        analytics_run_id=_header_int(x_chatkit_analytics_run_id),
        chat_mode=(x_chatkit_chat_mode or "").strip() or None,
        chat_model=(x_chatkit_chat_model or "").strip() or None,
        generation_model=(x_chatkit_generation_model or "").strip() or None,
        image_format=(x_chatkit_image_format or "").strip() or None,
        image_quality=(x_chatkit_image_quality or "").strip() or None,
        graph=graph,
        http_client=client,
    )

    body = await request.body()
    result: Any = await server.process(body, context)
    # Duck-type to avoid importing chatkit.server (openai-agents name clash) at module load.
    json_body = getattr(result, "json", None)
    if isinstance(json_body, (bytes, bytearray, str)):
        return Response(content=json_body, media_type="application/json")
    return StreamingResponse(
        result,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
