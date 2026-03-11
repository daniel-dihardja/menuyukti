"""Planning subgraph: Plan-and-Execute assembly."""

from langgraph.graph import StateGraph

from agent.ig_campaign.campaign_dates import generate_plan
from agent.ig_campaign.plan_execute import create_plan, execute_step, should_continue
from agent.state import State

planning_subgraph = (
    StateGraph(State)
    .add_node("generate_dates", generate_plan)
    .add_node("create_plan", create_plan)
    .add_node("execute_step", execute_step)
    .add_edge("__start__", "generate_dates")
    .add_edge("generate_dates", "create_plan")
    .add_edge("create_plan", "execute_step")
    .add_conditional_edges(
        "execute_step",
        should_continue,
        {"continue": "execute_step", "end": "__end__"},
    )
    .compile()
)
