"""Planning subgraph assembly."""

from langgraph.graph import StateGraph

from agent.planning.brief import generate_campaign_brief
from agent.planning.dates import generate_plan
from agent.planning.holidays import search_public_holidays
from agent.planning.items import choose_items
from agent.planning.operating_profile import fetch_operating_profile, generate_location_summary
from agent.state import State

planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_node("search_public_holidays", search_public_holidays)
    .add_node("fetch_operating_profile", fetch_operating_profile)
    .add_node("generate_location_summary", generate_location_summary)
    .add_node("choose_items", choose_items)
    .add_node("generate_campaign_brief", generate_campaign_brief)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "search_public_holidays")
    .add_edge("search_public_holidays", "fetch_operating_profile")
    .add_edge("fetch_operating_profile", "generate_location_summary")
    .add_edge("generate_location_summary", "choose_items")
    .add_edge("choose_items", "generate_campaign_brief")
    .add_edge("generate_campaign_brief", "__end__")
    .compile()
)
