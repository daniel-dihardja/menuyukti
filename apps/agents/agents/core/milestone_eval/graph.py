"""LangGraph: fetch context, parallel criterion evaluation, persist result node."""

from __future__ import annotations

from functools import partial

import httpx
from agents_app.agents.core.milestone_eval import nodes
from agents_app.agents.core.milestone_eval.state import MilestoneEvalState
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langgraph.graph import END, START, StateGraph


def build_milestone_eval_graph(
    client: httpx.AsyncClient,
    *,
    gateway_model_id: str | None = None,
):
    """Compile graph; pass a shared async HTTP client for GraphQL calls."""
    structured_llm = chat_llm_for_gateway_model(
        gateway_model_id, streaming=False
    ).with_structured_output(nodes.CriterionVerdict)
    llm = chat_llm_for_gateway_model(gateway_model_id, streaming=True)

    builder = StateGraph(MilestoneEvalState)
    builder.add_node("fetch_context", partial(nodes.fetch_context, client=client))
    # Send workers receive a partial dict, not full MilestoneEvalState (LangGraph Send API).
    builder.add_node(
        "evaluate_criterion",
        partial(nodes.evaluate_criterion, structured_llm=structured_llm),
    )  # type: ignore[type-var]
    builder.add_node("update_criteria", partial(nodes.update_criteria, client=client))
    builder.add_node("synthesize", partial(nodes.synthesize, llm=llm))
    builder.add_node("store_result", partial(nodes.store_result, client=client))

    builder.add_edge(START, "fetch_context")
    builder.add_conditional_edges(
        "fetch_context",
        nodes.route_after_fetch,
        ["evaluate_criterion", "synthesize"],
    )
    builder.add_edge("evaluate_criterion", "update_criteria")
    builder.add_edge("update_criteria", "synthesize")
    builder.add_edge("synthesize", "store_result")
    builder.add_edge("store_result", END)

    return builder.compile()
