"""Ask-mode node: conversational, data-aware responses without triggering the planning pipeline."""

import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from agent.config import LLM_MODEL
from agent.ig_campaign.node_utils import _update_planning
from agent.state import State

logger = logging.getLogger(__name__)

_ask_llm = ChatOpenAI(model=LLM_MODEL, temperature=0.7)

_SYSTEM_PROMPT = """You are a knowledgeable Instagram marketing advisor for a restaurant. \
You have access to the restaurant's profile data and can answer questions about its menu, \
operating patterns, audience, and marketing opportunities.

Be conversational, concise, and specific to the data you have. \
If relevant data isn't available, say so clearly and suggest what would help.

{location_context}"""

_NO_LOCATION_CONTEXT = "No restaurant data has been loaded yet for this session."


def _build_location_context(planning: Any) -> str:
    """Summarise available planning data as a compact context block for the system prompt."""
    if not planning:
        return _NO_LOCATION_CONTEXT

    parts: list[str] = []

    location = planning.location
    if location:
        name = location.get("name", "")
        city = location.get("city", "")
        country = location.get("country", "")
        description = location.get("description", "")
        parts.append(f"Restaurant: {name}" + (f" ({city}, {country})" if city else ""))
        if description:
            parts.append(f"Description: {description}")

    if planning.locationSummary:
        parts.append(f"\nMarketing Profile:\n{planning.locationSummary}")

    if planning.nationalHolidays:
        holiday_names = [h.get("name") for h in planning.nationalHolidays if h.get("name")]
        if holiday_names:
            parts.append(f"Upcoming public holidays: {', '.join(holiday_names[:5])}")

    operating = planning.operatingProfile
    if operating:
        primary_period = operating.get("primaryMealPeriod", "")
        peak_days = operating.get("peakDays", [])
        if primary_period:
            parts.append(f"Primary meal period: {primary_period}")
        if peak_days:
            parts.append(f"Busiest days: {', '.join(peak_days)}")

    if planning.campaign_brief:
        brief = planning.campaign_brief
        parts.append(
            f"\nActive campaign brief: {brief.campaign_theme} | {brief.tone} | "
            f"{len(brief.post_slots)} posts from {planning.dateStart} to {planning.dateEnd}"
        )

    return "\n".join(parts) if parts else _NO_LOCATION_CONTEXT


async def _lazy_fetch_location(state: State, config: RunnableConfig) -> dict[str, Any] | None:
    """Fetch lite location data if not already present in state. Returns planning update dict or None."""
    if state.planning and state.planning.location:
        return None

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    if not location_id:
        return None

    try:
        from agent.ig_campaign.data_fetch_lite import fetch_location_data
        result = await fetch_location_data(state, config)
        return result
    except Exception:
        logger.exception("handle_ask: failed to lazy-fetch location data")
        return None


async def handle_ask(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Conversational ask-mode node: answers questions with full data context, no plan side effects."""
    planning_update = await _lazy_fetch_location(state, config)

    effective_planning = state.planning
    if planning_update and "planning" in planning_update:
        effective_planning = planning_update["planning"]

    location_context = _build_location_context(effective_planning)
    system = _SYSTEM_PROMPT.format(location_context=location_context)

    history = list(state.messages)
    messages = [SystemMessage(content=system)] + history + [HumanMessage(content=state.message)]

    result = await _ask_llm.ainvoke(messages)
    response_text = result.content if isinstance(result.content, str) else str(result.content)

    update: dict[str, Any] = {
        "response": response_text,
        # Include the human message — classify_intent is skipped in ask mode so we record it here
        "messages": [HumanMessage(content=state.message), AIMessage(content=response_text)],
    }

    if planning_update:
        update["planning"] = effective_planning

    return update
