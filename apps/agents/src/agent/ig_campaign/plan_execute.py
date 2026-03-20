"""Plan-and-Execute planner: context-aware step sequence, executor dispatches each step."""

import logging
from dataclasses import replace
from typing import Any, Literal

from langchain_core.runnables import RunnableConfig

from agent.ig_campaign.campaign_brief import generate_campaign_brief
from agent.ig_campaign.post_format import assign_post_formats
from agent.ig_campaign.post_schedule import generate_post_schedule
from agent.ig_campaign.data_fetch import fetch_all_data
from agent.ig_campaign.data_fetch_lite import fetch_location_data
from agent.ig_campaign.venue_summary import generate_location_summary
from agent.ig_campaign.slot_calendar import generate_candidate_slots
from agent.ig_campaign.node_utils import _emit, _update_planning
from agent.state import ContextMode, State

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Step registry — name → async callable
# Each callable has the signature: (state: State, config: RunnableConfig) -> dict
# ---------------------------------------------------------------------------

STEP_REGISTRY: dict[str, Any] = {
    "fetch_all_data": fetch_all_data,
    "fetch_location_data": fetch_location_data,
    "generate_location_summary": generate_location_summary,
    "generate_candidate_slots": generate_candidate_slots,
    "generate_post_schedule": generate_post_schedule,
    "assign_post_formats": assign_post_formats,
    "generate_campaign_brief": generate_campaign_brief,
}

FULL_PLAN = [
    "fetch_all_data",
    "generate_location_summary",
    "generate_candidate_slots",
    "generate_post_schedule",
    "assign_post_formats",
    "generate_campaign_brief",
]

LITE_PLAN = [
    "fetch_location_data",
    "generate_location_summary",
    "generate_candidate_slots",
    "generate_post_schedule",
    "generate_campaign_brief",
]


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

async def create_plan(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Select the appropriate step sequence based on available context (full vs. lite)."""
    planning = state.planning
    configurable = config.get("configurable") or {}
    analytics_id = configurable.get("analytics_id")

    mode: ContextMode = "full" if analytics_id else "lite"
    plan = FULL_PLAN if mode == "full" else LITE_PLAN

    step_labels = " → ".join(plan)
    await _emit("create_plan", "done", f"Plan ({mode}): {step_labels}", config)
    return {"planning": _update_planning(planning, context_mode=mode, plan=plan, current_step=0)}


async def execute_step(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Executor: dispatch the current step in the plan and advance the step pointer."""
    planning = state.planning
    plan = planning.plan if planning else []
    current_step = planning.current_step if planning else 0

    if not plan or current_step >= len(plan):
        logger.warning("execute_step called with no remaining steps")
        return {}

    step_name = plan[current_step]
    fn = STEP_REGISTRY.get(step_name)

    if fn is None:
        logger.error("No function registered for step '%s'; skipping", step_name)
        updated = replace(planning, current_step=current_step + 1)
        return {"planning": updated}

    # Call the tool; it returns {"planning": PlanningState}
    result = await fn(state, config)

    # Merge: take the returned planning state and advance the step pointer
    returned_planning = result.get("planning", planning)
    advanced = replace(returned_planning, current_step=current_step + 1)
    return {"planning": advanced}


def should_continue(state: State) -> str:
    """Route back to execute_step if steps remain, otherwise end."""
    planning = state.planning
    if planning and planning.plan and planning.current_step < len(planning.plan):
        return "continue"
    return "end"
