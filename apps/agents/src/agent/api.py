from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from agent.graph import graph as audience_graph
from agent.tone_graph import graph as tone_graph

load_dotenv()

app = FastAPI(title="Agent API")


class AudienceInvokeRequest(BaseModel):
    core_input: dict[str, Any] = Field(default_factory=dict)


@app.post("/audience/invoke")
async def invoke_audience_agent(payload: AudienceInvokeRequest) -> dict[str, Any]:
    return await audience_graph.ainvoke({"core_input": payload.core_input})


class ToneInvokeRequest(BaseModel):
    core_input: dict[str, Any] = Field(default_factory=dict)


@app.post("/tone/invoke")
async def invoke_tone_agent(payload: ToneInvokeRequest) -> dict[str, Any]:
    return await tone_graph.ainvoke({"core_input": payload.core_input})
