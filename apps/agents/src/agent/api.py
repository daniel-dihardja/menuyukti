"""FastAPI application exposing the LangGraph agent over HTTP."""

import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent.graph import IntentCategory, graph

app = FastAPI(
    title="Agent API",
    description="HTTP API to invoke the LangGraph agent.",
    version="0.0.1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InvokeRequest(BaseModel):
    """Request body for the invoke endpoint."""

    message: str = Field(..., description="User message to send to the agent.")
    intent_category: IntentCategory = Field(
        default="planning",
        description="Intent category for classification (e.g. planning).",
    )


@app.get("/health")
def health() -> dict[str, str]:
    """Health check for deployment and load balancers."""
    return {"status": "ok"}


@app.post("/invoke/stream")
async def invoke_stream(body: InvokeRequest) -> StreamingResponse:
    """
    Run the agent graph and stream its response via Server-Sent Events.

    The graph (intent classification + handlers) is invoked; the handler's
    response is then sent as SSE. Each event: {"delta": "<text chunk>"}.
    Optional {"intent": "..."} for debug. Stream ends with: data: [DONE]
    """

    async def generate():
        try:
            state = await graph.ainvoke(
                {"message": body.message, "intent_category": body.intent_category}
            )
            response_text = state.get("response") or ""
            intent = state.get("intent")
            planning = state.get("planning")
            if intent:
                yield f"data: {json.dumps({'intent': intent})}\n\n".encode("utf-8")
            if planning and hasattr(planning, "dateStart"):
                yield f"data: {json.dumps({'planning': {'dateStart': planning.dateStart, 'dateEnd': planning.dateEnd}})}\n\n".encode("utf-8")
            if response_text:
                yield f"data: {json.dumps({'delta': response_text})}\n\n".encode("utf-8")
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n".encode("utf-8")
        yield "data: [DONE]\n\n".encode("utf-8")

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
        },
    )
