import logging
from dataclasses import replace
from typing import Any, Dict, Literal

from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel

from langchain_core.callbacks.manager import adispatch_custom_event

from agent.config import LLM_MODEL
from agent.ig_campaign import planning_subgraph
from agent.ig_campaign.data_fetch_lite import fetch_location_data
from agent.ig_campaign.edit_venue_summary import edit_venue_summary
from agent.ig_campaign.venue_summary import generate_location_summary
from agent.ig_campaign.node_utils import _build_location_context, _update_planning
from agent.state import IntentCategory, State

logger = logging.getLogger(__name__)


class IntentResult(BaseModel):
    """Structured result for intent classification."""

    intent: Literal[
        "create_location_profile",
        "create_instagram_campaign",
        "edit_venue_profile",
        "unknown",
    ]


llm = ChatOpenAI(
    model=LLM_MODEL,
    temperature=0.7,
)

intent_llm = ChatOpenAI(model=LLM_MODEL, temperature=0).with_structured_output(IntentResult)

INTENT_SYSTEM = (
    "You are an intent classifier. Classify the user message into exactly one of:\n"
    "- 'create_location_profile': user is explicitly requesting to create, generate, build, "
    "or refresh the venue/location profile only (no post schedule)\n"
    "- 'create_instagram_campaign': user is EXPLICITLY requesting to create, generate, "
    "build, or start a new Instagram campaign or post schedule right now\n"
    "- 'edit_venue_profile': user wants to update, add to, or correct the venue/restaurant "
    "profile or location summary\n"
    "- 'unknown': anything else — including questions about Instagram, how-to questions, "
    "general conversation, follow-up questions, or requests for advice\n\n"
    "Examples of 'create_location_profile': "
    "'create location profile', 'generate location summary', 'build my venue profile', "
    "'refresh our location profile'\n"
    "Examples of 'create_instagram_campaign': "
    "'create a campaign', 'generate my posts', 'build a schedule', "
    "'start a campaign for next month', 'make an instagram campaign brief'\n"
    "Examples of 'edit_venue_profile': "
    "'add that we have a summer garden', 'update the profile to mention our kids menu', "
    "'the venue description is missing our terrace', 'include that we serve brunch on weekends'\n"
    "Examples of 'unknown': "
    "'how do I create posts?', 'what should I post?', 'tell me about my restaurant', "
    "'how does this work?', 'what can you do?'\n\n"
    "Intent category hint: {intent_category}"
)

HANDLE_UNKNOWN_SYSTEM = (
    "You are a helpful Instagram marketing assistant for a restaurant. "
    "Answer the user's question conversationally and helpfully using the restaurant "
    "data below when relevant. If the user asks to create a campaign, explain they can "
    "ask you to 'create a campaign' or 'generate my posts' and you will build a full "
    "content schedule. Keep replies concise and friendly.\n\n{context}"
)

PLAN_RESPONSE_PROMPT = """The user asked: {message}

A campaign brief has been created:
- Campaign window: {date_start} to {date_end}
- Theme: {campaign_theme}
- Tone: {tone}
- Posting cadence: {posting_cadence}
- Total posts planned: {post_count}

Respond to the user with a short, friendly confirmation of the campaign concept."""

LOCATION_PROFILE_RESPONSE_PROMPT = """The user asked: {message}

A location profile has been generated for this restaurant.
Campaign window: {date_start} to {date_end}

Respond briefly: confirm the location profile is ready and mention that adding an analytics run would unlock a full post schedule with menu-specific format assignments."""

VENUE_EDIT_RESPONSE_PROMPT = """The user asked: {message}

The venue profile has been updated successfully.

Respond with a single friendly sentence confirming what was changed. Be specific about the addition or correction the user requested. Keep it concise."""


async def initialize_session(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Hydrate planning state with location and UI-seeded values before reasoning.

    Dates and holidays are refreshed from the UI on every turn so that changes
    made in the artifact panel (date pickers, re-fetched holidays) are always
    reflected in the next agent run.

    Location data is fetched only on the first turn (cold start) — MemorySaver
    persists it across turns at zero extra cost.
    """
    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    if not location_id:
        return {}

    planning = state.planning

    # Always refresh campaign window and holidays from the current UI values.
    date_start = configurable.get("date_start")
    date_end = configurable.get("date_end")
    if date_start and date_end:
        planning = _update_planning(planning, dateStart=date_start, dateEnd=date_end)

    national_holidays = configurable.get("national_holidays")
    if national_holidays:
        planning = _update_planning(planning, nationalHolidays=national_holidays)

    # Location data is fetched only once (cold start).
    if state.planning and state.planning.location:
        return {"planning": planning} if planning is not state.planning else {}

    try:
        result = await fetch_location_data(state, config)
        planning = result.get("planning", planning)
    except Exception:
        logger.exception("initialize_session: failed to fetch location data")
        return {}

    initial_summary: str | None = configurable.get("initial_location_summary")
    if initial_summary:
        planning = _update_planning(planning, locationSummary=initial_summary)

    return {"planning": planning}


async def classify_intent(state: State) -> Dict[str, Any]:
    """Classify the latest user message, using conversation history for context."""
    system = INTENT_SYSTEM.format(intent_category=state.intent_category)
    history = list(state.messages)
    messages = [SystemMessage(content=system)] + history + [HumanMessage(content=state.message)]
    result = await intent_llm.ainvoke(messages)
    return {
        "intent": result.intent,
        "messages": [HumanMessage(content=state.message)],
    }


def route_by_intent(state: State) -> str:
    """Route after classify_intent based on the classified intent."""
    valid = (
        "create_location_profile",
        "create_instagram_campaign",
        "edit_venue_profile",
        "unknown",
    )
    return state.intent if state.intent in valid else "unknown"


async def run_location_profile_flow(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Generate or refresh location profile outside the campaign planning subgraph."""
    fetched = await fetch_location_data(state, config)
    planning_after_fetch = fetched.get("planning", state.planning)
    summary_input_state = replace(state, planning=planning_after_fetch)
    summarized = await generate_location_summary(summary_input_state, config)
    return {"planning": summarized.get("planning", planning_after_fetch)}


async def check_campaign_requirements(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Validate mandatory inputs for campaign creation."""
    configurable = config.get("configurable") or {}
    analytics_id = configurable.get("analytics_id")

    if analytics_id:
        return {"campaign_requirements_met": True}

    msg = (
        "I need an analytics run to create an Instagram campaign. "
        "Please select an analytics run, or ask me to create the location profile first."
    )
    await adispatch_custom_event("response_delta", {"text": msg}, config=config)
    return {
        "campaign_requirements_met": False,
        "response": msg,
        "messages": [AIMessage(content=msg)],
    }


def route_campaign_requirements(state: State) -> str:
    """Route campaign flow depending on required input availability."""
    return "run" if state.campaign_requirements_met else "blocked"


async def handle_unknown(state: State) -> Dict[str, Any]:
    """Respond conversationally when the message doesn't trigger a planning intent."""
    context = _build_location_context(state.planning)
    system = HANDLE_UNKNOWN_SYSTEM.format(context=context)
    history = list(state.messages)
    messages = (
        [SystemMessage(content=system)]
        + history
        + [HumanMessage(content=state.message)]
    )
    result = await llm.ainvoke(messages)
    response_text = result.content if isinstance(result.content, str) else str(result.content)
    return {
        "response": response_text,
        "messages": [AIMessage(content=response_text)],
    }


async def respond_with_campaign(state: State) -> Dict[str, Any]:
    """Format a user-facing response from the campaign brief."""
    planning = state.planning
    brief = planning.campaign_brief if planning else None
    prompt = PLAN_RESPONSE_PROMPT.format(
        message=state.message,
        date_start=planning.dateStart if planning else "unknown",
        date_end=planning.dateEnd if planning else "unknown",
        campaign_theme=brief.campaign_theme if brief else "N/A",
        tone=brief.tone if brief else "N/A",
        posting_cadence=brief.posting_cadence if brief else "N/A",
        post_count=len(brief.post_slots) if brief else 0,
    )

    result = await llm.ainvoke(prompt)
    return {
        "response": result.content,
        "messages": [AIMessage(content=result.content)],
    }


async def respond_with_location_profile(state: State) -> Dict[str, Any]:
    """Format a user-facing confirmation for location profile generation."""
    planning = state.planning
    prompt = LOCATION_PROFILE_RESPONSE_PROMPT.format(
        message=state.message,
        date_start=planning.dateStart if planning else "unknown",
        date_end=planning.dateEnd if planning else "unknown",
    )
    result = await llm.ainvoke(prompt)
    return {
        "response": result.content,
        "messages": [AIMessage(content=result.content)],
    }


async def handle_venue_edit(state: State, config: RunnableConfig) -> Dict[str, Any]:
    """Edit the venue profile summary based on the user's natural language instruction.

    Explicit event order (all text sent via response_delta, not on_chat_model_stream,
    so that we fully control what appears in the chat and when):
      1. response_delta: short acknowledgement ("On it...")
      2. edit_venue_summary tool runs (activity events)
      3. planning_update: artifact panel refreshes
      4. response_delta: LLM-generated closing confirmation
    """
    if not (state.planning and state.planning.locationSummary):
        msg = (
            "I don't have a venue profile loaded yet. "
            "Please create a location profile first and I'll be able to update it."
        )
        await adispatch_custom_event("response_delta", {"text": msg}, config=config)
        return {
            "response": msg,
            "messages": [AIMessage(content=msg)],
        }

    # Step 1 — short acknowledgement before the tool runs
    await adispatch_custom_event(
        "response_delta",
        {"text": "On it, updating your venue profile..."},
        config=config,
    )

    # Step 2 — run the edit tool
    edit_result = await edit_venue_summary(state, config)
    updated_planning = edit_result.get("planning")

    # Step 3 — push updated artifact to the panel
    if updated_planning:
        await adispatch_custom_event(
            "planning_update",
            {"planning": updated_planning},
            config=config,
        )

    # Step 4 — LLM-generated closing confirmation (awaited fully; no streaming needed
    # since the interesting update already happened via the artifact)
    prompt = VENUE_EDIT_RESPONSE_PROMPT.format(message=state.message)
    result = await llm.ainvoke(prompt)
    response_text = result.content if isinstance(result.content, str) else str(result.content)
    await adispatch_custom_event("response_delta", {"text": "\n\n" + response_text}, config=config)

    return {
        **edit_result,
        "response": response_text,
        "messages": [AIMessage(content=response_text)],
    }


# Build graph with MemorySaver for multi-turn conversation memory
graph = (
    StateGraph(State)
    .add_node("initialize_session", initialize_session)
    .add_node("classify_intent", classify_intent)
    .add_node("run_location_profile_flow", run_location_profile_flow)
    .add_node("check_campaign_requirements", check_campaign_requirements)
    .add_node("run_campaign_agent", planning_subgraph)
    .add_node("handle_unknown", handle_unknown)
    .add_node("handle_venue_edit", handle_venue_edit)
    .add_node("respond_with_campaign", respond_with_campaign)
    .add_node("respond_with_location_profile", respond_with_location_profile)
    .add_edge("__start__", "initialize_session")
    .add_edge("initialize_session", "classify_intent")
    .add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "create_location_profile": "run_location_profile_flow",
            "create_instagram_campaign": "check_campaign_requirements",
            "edit_venue_profile": "handle_venue_edit",
            "unknown": "handle_unknown",
        },
    )
    .add_conditional_edges(
        "check_campaign_requirements",
        route_campaign_requirements,
        {
            "run": "run_campaign_agent",
            "blocked": "__end__",
        },
    )
    .add_edge("run_campaign_agent", "respond_with_campaign")
    .add_edge("run_location_profile_flow", "respond_with_location_profile")
    .add_edge("respond_with_campaign", "__end__")
    .add_edge("respond_with_location_profile", "__end__")
    .add_edge("handle_venue_edit", "__end__")
    .add_edge("handle_unknown", "__end__")
    .compile(checkpointer=MemorySaver())
)
