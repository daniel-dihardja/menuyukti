"""FastAPI application exposing the LangGraph agent over HTTP."""

import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from pydantic import BaseModel, Field

from agent.graph import graph, llm

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

    return InvokeResponse(response=response_text)


@app.post("/invoke/stream")
async def invoke_stream(body: InvokeRequest) -> StreamingResponse:
    """
    Stream the agent's response token-by-token via Server-Sent Events.

    Each event is a JSON object: {"delta": "<text chunk>"}.
    Stream ends with: data: [DONE]
    """

    async def generate():
        try:
            async for chunk in llm.astream([HumanMessage(content=body.message)]):
                if chunk.content:
                    yield f"data: {json.dumps({'delta': chunk.content})}\n\n".encode("utf-8")
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
