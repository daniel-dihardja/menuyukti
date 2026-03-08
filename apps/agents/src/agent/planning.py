"""Planning subgraph for the agent."""

import logging
from typing import Any, Dict

from langgraph.graph import StateGraph

from agent.state import State

logger = logging.getLogger(__name__)


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: output markdown that mentions planning."""
    logger.info("run_planning_agent: returning planning markdown")
    markdown = (
        "# Planning\n\n"
        f"Planning for your request: {state.message}\n\n"
        "*Plan details can be added here.*"
    )
    return {"response": markdown}


planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "__end__")
    .compile()
)
