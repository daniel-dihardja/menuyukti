"""Plan-and-Execute planner: static campaign step sequence + executor dispatch."""

import logging
from dataclasses import replace
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig

from agent.ig_campaign.campaign_brief import generate_campaign_brief
from agent.ig_campaign.post_format import assign_post_formats
from agent.ig_campaign.post_schedule import generate_post_schedule
from agent.ig_campaign.data_fetch import fetch_all_data
from agent.ig_campaign.slot_calendar import generate_candidate_slots
from agent.ig_campaign.node_utils import _emit, _update_planning
from agent.state import State

# Steps that produce a meaningful artifact-panel update and should stream
# a planning_update event to the UI as soon as they complete.
_PLANNING_UPDATE_STEPS = {"generate_campaign_brief"}

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Step registry — name → async callable
# Each callable has the signature: (state: State, config: RunnableConfig) -> dict
# ---------------------------------------------------------------------------

STEP_REGISTRY: dict[str, Any] = {
    "fetch_all_data": fetch_all_data,
    "generate_candidate_slots": generate_candidate_slots,
    "generate_post_schedule": generate_post_schedule,
    "assign_post_formats": assign_post_formats,
    "generate_campaign_brief": generate_campaign_brief,
}

CAMPAIGN_PLAN = [
    "fetch_all_data",
    "generate_candidate_slots",
    "generate_post_schedule",
    "assign_post_formats",
    "generate_campaign_brief",
]

# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

async def create_plan(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Create a static campaign plan sequence for plan-and-execute."""
    planning = state.planning
    step_labels = " → ".join(CAMPAIGN_PLAN)
    await _emit("create_plan", "done", f"Plan: {step_labels}", config)
    return {"planning": _update_planning(planning, plan=CAMPAIGN_PLAN, current_step=0)}


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

    # Push an intermediate artifact-panel update for steps that produce visible
    # UI output (location profile, campaign brief) so the panel updates live
    # without waiting for the entire pipeline to finish.
    if step_name in _PLANNING_UPDATE_STEPS:
        try:
            await adispatch_custom_event(
                "planning_update",
                {"planning": advanced},
                config=config,
            )
        except Exception:
            logger.warning("planning_update dispatch failed for step '%s'", step_name)

    return {"planning": advanced}


def should_continue(state: State) -> str:
    """Route back to execute_step if steps remain, otherwise end."""
    planning = state.planning
    if planning and planning.plan and planning.current_step < len(planning.plan):
        return "continue"
    return "end"
