"""Planning subgraph for the agent."""

import logging
from datetime import datetime
from typing import Any, Dict

from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph

from agent.state import State

logger = logging.getLogger(__name__)


@tool
def get_current_date() -> str:
    """Returns today's date in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7).bind_tools([get_current_date])

_tools = {get_current_date.name: get_current_date}


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: invoke LLM with tool support to produce a plan."""
    logger.info("generate_plan: invoking LLM")
    messages = [HumanMessage(content=state.message)]

    while True:
        response = await _llm.ainvoke(messages)
        messages.append(response)

        if not response.tool_calls:
            break

        for tc in response.tool_calls:
            result = _tools[tc["name"]].invoke(tc["args"])
            messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))

    return {"response": response.content}


planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "__end__")
    .compile()
)
