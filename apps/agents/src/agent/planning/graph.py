"""Planning subgraph assembly."""

from langgraph.graph import StateGraph

from agent.planning.brief import generate_campaign_brief, generate_post_schedule
from agent.planning.dates import generate_plan
from agent.planning.fetch import fetch_all_data
from agent.planning.holidays import search_public_holidays
from agent.planning.operating_profile import generate_location_summary
from agent.planning.schedule import generate_candidate_slots
from agent.state import State

planning_subgraph = (
    StateGraph(State)
    .add_node("generate_plan", generate_plan)
    .add_node("fetch_all_data", fetch_all_data)
    .add_node("search_public_holidays", search_public_holidays)
    .add_node("generate_location_summary", generate_location_summary)
    .add_node("generate_candidate_slots", generate_candidate_slots)
    .add_node("generate_post_schedule", generate_post_schedule)
    .add_node("generate_campaign_brief", generate_campaign_brief)
    .add_edge("__start__", "generate_plan")
    .add_edge("generate_plan", "fetch_all_data")
    .add_edge("fetch_all_data", "search_public_holidays")
    .add_edge("search_public_holidays", "generate_location_summary")
    .add_edge("generate_location_summary", "generate_candidate_slots")
    .add_edge("generate_candidate_slots", "generate_post_schedule")
    .add_edge("generate_post_schedule", "generate_campaign_brief")
    .add_edge("generate_campaign_brief", "__end__")
    .compile()
)
