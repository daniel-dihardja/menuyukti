"""Tool: edit an existing venue profile summary via natural language instruction."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL
from agent.gql_client import save_location_profile
from agent.ig_campaign.node_utils import _emit, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)

_edit_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.3)

_EDIT_PROMPT = """You are editing a restaurant venue profile for Instagram marketing.

Current profile:
{current_summary}

User instruction: {instruction}

Apply the instruction precisely. Change only what was asked.
Return only the updated profile text — no explanation, no preamble."""


async def edit_venue_summary(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Apply a natural-language instruction to the existing venue profile summary.

    Overwrites the backend cache with the edited text so future sessions receive
    the updated version. Safe to call only when state.planning.locationSummary exists.
    """
    await _emit("edit_venue_summary", "running", "Updating venue profile...", config)

    planning = state.planning
    current_summary = planning.locationSummary if planning else None

    if not current_summary:
        logger.warning("edit_venue_summary called with no existing locationSummary; skipping")
        await _emit("edit_venue_summary", "done", "No venue profile to update", config)
        return {}

    prompt = _EDIT_PROMPT.format(
        current_summary=current_summary,
        instruction=state.message,
    )

    try:
        result = await _edit_llm.ainvoke(prompt)
        new_summary = result.content if isinstance(result.content, str) else str(result.content)
    except Exception:
        logger.exception("edit_venue_summary: LLM call failed")
        await _emit("edit_venue_summary", "done", "Failed to update venue profile", config)
        return {}

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")
    cache_analytics_id = analytics_id if analytics_id else "0"

    if location_id:
        try:
            await save_location_profile(location_id, cache_analytics_id, new_summary)
        except Exception:
            logger.warning("edit_venue_summary: failed to persist updated profile to cache")

    await _emit("edit_venue_summary", "done", "Venue profile updated", config)
    return {"planning": _update_planning(planning, locationSummary=new_summary)}
