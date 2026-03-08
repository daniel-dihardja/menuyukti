"""FastAPI application exposing the LangGraph agent over HTTP."""

import json
import logging

from dotenv import load_dotenv

load_dotenv()

# Show intent classification and routing in server logs
logging.getLogger("agent.graph").setLevel(logging.INFO)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from agent.graph import graph

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


class InvokeResponse(BaseModel):
    """Response body for the invoke endpoint."""

    response: str = Field(..., description="Agent response.")
    debug: dict | None = Field(
        default=None,
        description="Optional debug info (e.g. classified intent).",
    )


@app.get("/health")
def health() -> dict[str, str]:
    """Health check for deployment and load balancers."""
    return {"status": "ok"}


@app.post("/invoke", response_model=InvokeResponse)
async def invoke(body: InvokeRequest) -> InvokeResponse:
    """
    Invoke the agent graph with the given message.

    Returns the agent's response.
    """
    try:
        state = await graph.ainvoke({"message": body.message})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    response_text = state.get("response")
    if response_text is None:
        raise HTTPException(
            status_code=500,
            detail="Agent did not return a response.",
        )

    debug = {"intent": state.get("intent")} if state.get("intent") else None
    return InvokeResponse(response=response_text, debug=debug)


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
            state = await graph.ainvoke({"message": body.message})
            response_text = state.get("response") or ""
            intent = state.get("intent")
            if intent:
                yield f"data: {json.dumps({'intent': intent})}\n\n".encode("utf-8")
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
