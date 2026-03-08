"""Planning subgraph for the agent."""

import calendar
from datetime import datetime
from typing import Any, Dict

from langchain_core.tools import tool
from langgraph.graph import StateGraph

from agent.state import PlanningState, State


@tool
def get_current_date() -> str:
    """Returns today's date in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


def _compute_campaign_dates() -> tuple[str, str]:
    """Return (dateStart, dateEnd) for the next calendar month."""
    today = datetime.strptime(get_current_date.invoke({}), "%Y-%m-%d")
    year, month = today.year, today.month + 1
    if month > 12:
        month = 1
        year += 1
    last_day = calendar.monthrange(year, month)[1]
    date_start = datetime(year, month, 1).strftime("%Y-%m-%d")
    date_end = datetime(year, month, last_day).strftime("%Y-%m-%d")
    return date_start, date_end


async def generate_plan(state: State) -> Dict[str, Any]:
    """Planning node: determine campaign start and end dates for next month."""
    date_start, date_end = _compute_campaign_dates()
    return {"planning": PlanningState(dateStart=date_start, dateEnd=date_end)}


planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "__end__")
    .compile()
)
