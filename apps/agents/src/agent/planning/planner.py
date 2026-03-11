"""Plan-and-Execute planner: LLM generates a step list, executor dispatches each step."""

import logging
from dataclasses import replace
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from agent.planning.brief import generate_campaign_brief, generate_post_schedule
from agent.planning.fetch import fetch_all_data
from agent.planning.holidays import search_public_holidays
from agent.planning.operating_profile import generate_location_summary
from agent.planning.schedule import generate_candidate_slots
from agent.planning.utils import _emit, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Step registry — name → async callable
# Each callable has the signature: (state: State, config: RunnableConfig) -> dict
# ---------------------------------------------------------------------------

STEP_REGISTRY: dict[str, Any] = {
    "fetch_all_data": fetch_all_data,
    "search_public_holidays": search_public_holidays,
    "generate_location_summary": generate_location_summary,
    "generate_candidate_slots": generate_candidate_slots,
    "generate_post_schedule": generate_post_schedule,
    "generate_campaign_brief": generate_campaign_brief,
}

_STEP_DESCRIPTIONS = """
- fetch_all_data: Fetch restaurant location info, operating profile, and menu items from the data service.
- search_public_holidays: Fetch public holidays for the campaign country and date window.
- generate_location_summary: Generate a concise marketing profile of the restaurant from operating data.
- generate_candidate_slots: Build the candidate posting date calendar for the campaign window.
- generate_post_schedule: Select the optimal 3–5 posting dates per week from the candidate calendar.
- generate_campaign_brief: Annotate the post schedule with campaign theme, tone, and caption directives.
""".strip()

_PLANNER_PROMPT = """You are planning an Instagram campaign for a restaurant.

Campaign window: {date_start} to {date_end}
User request: {message}

Your job is to decide which steps to execute and in what order to produce a complete campaign brief.

Available steps (in their natural dependency order):
{step_descriptions}

Rules:
- Always end with generate_campaign_brief — it is the required final output.
- generate_candidate_slots requires fetch_all_data and search_public_holidays to run first.
- generate_post_schedule requires generate_candidate_slots to run first.
- generate_location_summary requires fetch_all_data to run first.
- generate_campaign_brief requires generate_post_schedule and generate_location_summary to run first.
- Only include steps that are needed. If data is missing (e.g. no analytics_id), still include all steps — they handle missing data gracefully.

Return an ordered list of step names to execute."""


class PlanResult(BaseModel):
    """Structured output for the planner LLM."""

    steps: list[str]


_planner_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0).with_structured_output(PlanResult)


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------

async def create_plan(state: State, config: RunnableConfig) -> dict[str, Any]:
    """LLM planner: generate an ordered list of steps for the campaign pipeline."""
    await _emit("create_plan", "running", "Planning campaign steps...", config)

    planning = state.planning
    date_start = planning.dateStart if planning else "unknown"
    date_end = planning.dateEnd if planning else "unknown"

    prompt = _PLANNER_PROMPT.format(
        date_start=date_start,
        date_end=date_end,
        message=state.message,
        step_descriptions=_STEP_DESCRIPTIONS,
    )

    result = await _planner_llm.ainvoke(prompt)

    # Validate: filter out any step names not in the registry to prevent hallucinations
    valid_steps = [s for s in result.steps if s in STEP_REGISTRY]
    if len(valid_steps) != len(result.steps):
        hallucinated = set(result.steps) - set(valid_steps)
        logger.warning("Planner returned unknown steps (removed): %s", hallucinated)

    step_labels = " → ".join(valid_steps) if valid_steps else "none"
    await _emit("create_plan", "done", f"Plan: {step_labels}", config)

    return {"planning": _update_planning(planning, plan=valid_steps, current_step=0)}


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
