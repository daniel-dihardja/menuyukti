"""LangGraph: fetch context, parallel criterion evaluation, persist result node."""

from __future__ import annotations

from typing import Any, Literal

import httpx
from agents_app.agents.core.milestone_eval.graphql_client import (
    create_result_node,
    delete_node,
    fetch_milestone_children,
    update_passcriteria_status,
)
from agents_app.agents.core.milestone_eval.prompts import (
    EVAL_SYSTEM,
    SYNTHESIS_SYSTEM,
    eval_human_message,
    synthesis_human_message,
)
from agents_app.agents.core.milestone_eval.state import CriterionEval, MilestoneEvalState
from agents_app.models.llm_config import get_llm, get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send
from pydantic import BaseModel, Field


class CriterionVerdict(BaseModel):
    """Structured LLM output for a single pass/fail decision."""

    status: Literal["pass", "fail"] = Field(description="pass or fail")
    reasoning: str = Field(description="One short sentence justification")


def _node_type(ch: dict[str, Any]) -> str:
    return str(ch.get("nodeType") or ch.get("node_type") or "")


def build_milestone_eval_graph(client: httpx.AsyncClient):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""

    async def fetch_context(state: MilestoneEvalState) -> dict[str, Any]:
        writer = get_stream_writer()
        writer({"step": "fetch_context"})
        children = await fetch_milestone_children(
            state["milestone_id"],
            state["location_id"],
            state["user_id"],
            client=client,
        )
        goal = ""
        raw_data = ""
        criteria: list[dict[str, str]] = []
        for ch in children:
            nt = _node_type(ch)
            raw = ch.get("data")
            data = raw if isinstance(raw, dict) else {}
            if nt == "goal":
                g = data.get("goal")
                if isinstance(g, str):
                    goal = g
            elif nt == "milestonedata":
                d = data.get("data")
                if isinstance(d, str):
                    raw_data = d
            elif nt == "passcriteria":
                req = data.get("requirement", "")
                cid = str(ch.get("id", ""))
                if isinstance(req, str) and cid:
                    criteria.append({"id": cid, "requirement": req})
        return {"goal": goal, "raw_data": raw_data, "criteria": criteria}

    async def evaluate_criterion(state: dict[str, Any]) -> dict[str, Any]:
        goal = str(state.get("goal", ""))
        raw_data = str(state.get("raw_data", ""))
        criterion_id = str(state.get("criterion_id", ""))
        requirement = str(state.get("requirement", ""))
        llm = get_llm_structured().with_structured_output(CriterionVerdict)
        verdict = await llm.ainvoke(
            [
                SystemMessage(content=EVAL_SYSTEM),
                HumanMessage(content=eval_human_message(goal, raw_data, requirement)),
            ]
        )
        writer = get_stream_writer()
        writer(
            {
                "step": "evaluate_criterion",
                "id": criterion_id,
                "status": verdict.status,
            }
        )
        row: CriterionEval = {
            "id": criterion_id,
            "requirement": requirement,
            "status": verdict.status,
            "reasoning": verdict.reasoning,
        }
        return {"evaluated": [row]}

    async def update_criteria(state: MilestoneEvalState) -> dict[str, Any]:
        writer = get_stream_writer()
        writer({"step": "update_criteria"})
        for ev in state.get("evaluated", []):
            await update_passcriteria_status(
                ev["id"],
                ev["status"],
                state["user_id"],
                client=client,
            )
        return {}

    async def synthesize(state: MilestoneEvalState) -> dict[str, Any]:
        writer = get_stream_writer()
        writer({"step": "synthesize"})
        llm = get_llm()
        evaluated = state.get("evaluated", [])
        payload = [
            {
                "id": e["id"],
                "requirement": e["requirement"],
                "status": e["status"],
                "reasoning": e["reasoning"],
            }
            for e in evaluated
        ]
        msg = synthesis_human_message(state.get("goal", ""), payload)
        # Use streaming model but aggregate (synthesis is short)
        full = ""
        async for chunk in llm.astream(
            [SystemMessage(content=SYNTHESIS_SYSTEM), HumanMessage(content=msg)]
        ):
            c = chunk.content
            if isinstance(c, str):
                full += c
            elif isinstance(c, list):
                full += "".join(str(x) for x in c)
        return {"result_summary": full.strip()}

    async def store_result(state: MilestoneEvalState) -> dict[str, Any]:
        writer = get_stream_writer()
        writer({"step": "store_result"})
        children = await fetch_milestone_children(
            state["milestone_id"],
            state["location_id"],
            state["user_id"],
            client=client,
        )
        for ch in children:
            if _node_type(ch) == "result":
                rid = str(ch.get("id", ""))
                if rid:
                    await delete_node(rid, state["user_id"], client=client)

        evaluated = state.get("evaluated", [])
        passed = sum(1 for e in evaluated if e.get("status") == "pass")
        total = len(evaluated)
        criteria_out = [
            {
                "id": e["id"],
                "requirement": e["requirement"],
                "status": e["status"],
                "reasoning": e["reasoning"],
            }
            for e in evaluated
        ]
        data = {
            "summary": state.get("result_summary", ""),
            "passed": passed,
            "total": total,
            "criteria": criteria_out,
        }
        node = await create_result_node(
            state["milestone_id"],
            state["location_id"],
            data,
            state["user_id"],
            client=client,
        )
        nid = str(node.get("id", ""))
        return {"result_node_id": nid}

    def route_after_fetch(
        state: MilestoneEvalState,
    ) -> list[Send] | Literal["synthesize"]:
        crit = state.get("criteria") or []
        if not crit:
            return "synthesize"
        return [
            Send(
                "evaluate_criterion",
                {
                    "goal": state.get("goal", ""),
                    "raw_data": state.get("raw_data", ""),
                    "criterion_id": c["id"],
                    "requirement": c["requirement"],
                },
            )
            for c in crit
        ]

    builder = StateGraph(MilestoneEvalState)
    builder.add_node("fetch_context", fetch_context)
    # Send workers receive a partial dict, not full MilestoneEvalState (LangGraph Send API).
    builder.add_node("evaluate_criterion", evaluate_criterion)  # type: ignore[type-var]
    builder.add_node("update_criteria", update_criteria)
    builder.add_node("synthesize", synthesize)
    builder.add_node("store_result", store_result)

    builder.add_edge(START, "fetch_context")
    builder.add_conditional_edges(
        "fetch_context",
        route_after_fetch,
        ["evaluate_criterion", "synthesize"],
    )
    builder.add_edge("evaluate_criterion", "update_criteria")
    builder.add_edge("update_criteria", "synthesize")
    builder.add_edge("synthesize", "store_result")
    builder.add_edge("store_result", END)

    return builder.compile()
