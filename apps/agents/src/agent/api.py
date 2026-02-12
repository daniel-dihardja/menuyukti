from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from agent.graph import graph

app = FastAPI(title="Audience Agent API")


class AudienceInvokeRequest(BaseModel):
    core_input: dict[str, Any] = Field(default_factory=dict)


@app.post("/audience/invoke")
async def invoke_audience_agent(payload: AudienceInvokeRequest) -> dict[str, Any]:
    return await graph.ainvoke({"core_input": payload.core_input})
