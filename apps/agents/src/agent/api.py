from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from agent.tool_contract import (
    ToolInvokeRequest,
    evaluate_runtime_policy,
    validate_tool_payload,
)
from agent.consensus import DebateConsensusRequest, run_consensus
from agent.learning import LearningEligibilityRequest, evaluate_learning_eligibility
from agent.memory import MemoryContextRequest, build_memory_context
from agent.profit_intelligence import ProfitIntelligenceRequest, generate_action_board
from agent.rerank import RerankRequest, rerank_recommendations
from agent.release_loop import ReleaseLoopRequest, evaluate_release_loop
from agent.simulation import WhatIfSimulationRequest, run_what_if_simulation
from agent.strategist import StrategistWeeklyPlanRequest, generate_weekly_plan

load_dotenv()

app = FastAPI(title="Agent API")


@app.post("/tools/invoke", response_model=None)
async def invoke_tool(payload: ToolInvokeRequest):
    policy = evaluate_runtime_policy(payload)
    if not policy.allowed:
        return JSONResponse(
            status_code=403,
            content={
                "contract_version": payload.contract_version,
                "status": "blocked",
                "reason_code": policy.reason_code,
                "tool_id": payload.tool_id,
            },
        )

    validation = validate_tool_payload(payload)
    if not validation.allowed:
        return JSONResponse(
            status_code=400,
            content={
                "contract_version": payload.contract_version,
                "status": "invalid",
                "reason_code": validation.reason_code,
                "tool_id": payload.tool_id,
            },
        )

    # AS-02 scope: policy + contract validation in invocation path.
    # Tool execution remains a no-op stub until AS-03+ surfaces integrate.
    return {
        "contract_version": payload.contract_version,
        "status": "accepted",
        "reason_code": "ALLOWED",
        "tool_id": payload.tool_id,
        "persona": payload.persona,
        "workflow_stage": payload.workflow_stage,
    }


@app.post("/agents/strategist/weekly-plan", response_model=None)
async def strategist_weekly_plan(payload: StrategistWeeklyPlanRequest):
    return generate_weekly_plan(payload)


@app.post("/agents/profit-intelligence/action-board", response_model=None)
async def profit_intelligence_action_board(payload: ProfitIntelligenceRequest):
    return generate_action_board(payload)


@app.post("/agents/consensus/debate", response_model=None)
async def consensus_debate(payload: DebateConsensusRequest):
    return run_consensus(payload)


@app.post("/agents/simulation/what-if", response_model=None)
async def what_if_simulation(payload: WhatIfSimulationRequest):
    return run_what_if_simulation(payload)


@app.post("/agents/memory/context", response_model=None)
async def memory_context(payload: MemoryContextRequest):
    return build_memory_context(payload)


@app.post("/agents/learning/eligibility", response_model=None)
async def learning_eligibility(payload: LearningEligibilityRequest):
    return evaluate_learning_eligibility(payload)


@app.post("/agents/rerank/recommendations", response_model=None)
async def rerank_recommendation_list(payload: RerankRequest):
    return rerank_recommendations(payload)


@app.post("/agents/learning/release-loop/evaluate", response_model=None)
async def learning_release_loop(payload: ReleaseLoopRequest):
    return evaluate_release_loop(payload)
