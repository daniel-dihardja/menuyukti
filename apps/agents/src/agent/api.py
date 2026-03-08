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
    location_id: int | None = Field(default=None, description="Location ID resolved server-side; never exposed to the LLM.")
    analytics_id: int | None = Field(default=None, description="Analytics run ID resolved server-side; never exposed to the LLM.")


@app.get("/health")
def health() -> dict[str, str]:
    """Health check for deployment and load balancers."""
    return {"status": "ok"}


def activity_sse(step: str, status: str, label: str, detail: str | None = None) -> bytes:
    """Encode an agent activity event as an SSE bytes payload."""
    payload: dict = {"activity": {"step": step, "status": status, "label": label}}
    if detail:
        payload["activity"]["detail"] = detail
    return f"data: {json.dumps(payload)}\n\n".encode("utf-8")


@app.post("/invoke/stream")
async def invoke_stream(body: InvokeRequest) -> StreamingResponse:
    """
    Run the agent graph and stream its response via Server-Sent Events.

    Uses astream_events (v2) to emit events as each node runs:
    - activity events emitted on node start/end for agent transparency
    - planning data emitted immediately when run_planning_agent completes
    - LLM tokens streamed word-by-word from respond_with_plan
    - static fallback emitted on handle_unknown completion
    Stream ends with: data: [DONE]
    """

    async def generate():
        try:
            async for event in graph.astream_events(
                {"message": body.message, "intent_category": body.intent_category},
                config={"configurable": {"location_id": body.location_id, "analytics_id": body.analytics_id}},
                version="v2",
            ):
                kind = event["event"]
                name = event.get("name", "")
                metadata = event.get("metadata", {})

                if (
                    kind == "on_chat_model_stream"
                    and metadata.get("langgraph_node") == "respond_with_plan"
                ):
                    chunk = event["data"].get("chunk")
                    content = getattr(chunk, "content", "") if chunk else ""
                    if content:
                        yield f"data: {json.dumps({'delta': content})}\n\n".encode("utf-8")

                elif kind == "on_chain_start" and name == "classify_intent":
                    yield activity_sse("classify_intent", "running", "Understanding your request...")

                elif kind == "on_chain_end" and name == "classify_intent":
                    yield activity_sse("classify_intent", "done", "Request understood")

                elif kind == "on_chain_start" and name == "run_planning_agent":
                    yield activity_sse("run_planning_agent", "running", "Planning campaign dates...")

                elif kind == "on_chain_end" and name == "run_planning_agent":
                    output = event["data"].get("output") or {}
                    planning = output.get("planning")
                    if planning and hasattr(planning, "dateStart"):
                        detail = f"{planning.dateStart} – {planning.dateEnd}"
                        yield activity_sse("run_planning_agent", "done", "Campaign dates planned", detail)
                        yield f"data: {json.dumps({'planning': {'dateStart': planning.dateStart, 'dateEnd': planning.dateEnd}})}\n\n".encode("utf-8")

                elif kind == "on_chain_start" and name == "respond_with_plan":
                    yield activity_sse("respond_with_plan", "running", "Writing response...")

                elif kind == "on_chain_end" and name == "handle_unknown":
                    output = event["data"].get("output") or {}
                    response = output.get("response", "")
                    if response:
                        yield f"data: {json.dumps({'delta': response})}\n\n".encode("utf-8")

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
