"""FastAPI application exposing the LangGraph agent over HTTP."""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
