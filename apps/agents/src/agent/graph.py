import logging
from typing import Any, Dict, Literal

from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel

from langchain_core.callbacks.manager import adispatch_custom_event

from agent.config import LLM_MODEL
from agent.gql_client import fetch_location_profile
from agent.ig_campaign import planning_subgraph
from agent.ig_campaign.data_fetch_lite import fetch_location_data
from agent.ig_campaign.edit_venue_summary import edit_venue_summary
from agent.ig_campaign.node_utils import _build_location_context, _update_planning
from agent.state import IntentCategory, State

logger = logging.getLogger(__name__)


class IntentResult(BaseModel):
    """Structured result for intent classification."""

    intent: Literal["create_instagram_campaign", "edit_venue_profile", "unknown"]


llm = ChatOpenAI(
    model=LLM_MODEL,
    temperature=0.7,
)

intent_llm = ChatOpenAI(model=LLM_MODEL, temperature=0).with_structured_output(IntentResult)

INTENT_SYSTEM = (
    "You are an intent classifier. Classify the user message into exactly one of:\n"
    "- 'create_instagram_campaign': user is EXPLICITLY requesting to create, generate, "
    "build, or start a new Instagram campaign or post schedule right now\n"
    "- 'edit_venue_profile': user wants to update, add to, or correct the venue/restaurant "
    "profile or location summary\n"
    "- 'unknown': anything else — including questions about Instagram, how-to questions, "
    "general conversation, follow-up questions, or requests for advice\n\n"
    "Examples of 'create_instagram_campaign': "
    "'create a campaign', 'generate my posts', 'build a schedule', 'start a campaign for next month', "
    "'create location profile', 'generate location summary', 'build my venue profile'\n"
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

PLAN_RESPONSE_PROMPT_LITE = """The user asked: {message}

A location profile has been generated for this restaurant.
Campaign window: {date_start} to {date_end}

Respond briefly: confirm the location profile is ready and mention that adding an analytics run would unlock a full post schedule with menu-specific format assignments."""

VENUE_EDIT_RESPONSE_PROMPT = """The user asked: {message}

The venue profile has been updated successfully.

Respond with a single friendly sentence confirming what was changed. Be specific about the addition or correction the user requested. Keep it concise."""


async def initialize_session(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Hydrate planning state with location + profile before any reasoning node runs.

    On turns 2+, MemorySaver has already restored state.planning — the guard at the
    top makes this a no-op, adding zero latency to ongoing conversations.

    On cold start (turn 1):
      1. Fetch lite location data (name/city/country).
      2. Seed locationSummary from the frontend-provided value (zero extra DB call)
         or fall back to the DB cache under the sentinel key "0".
    """
    if state.planning and state.planning.location:
        return {}

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    if not location_id:
        return {}

    planning = state.planning
    try:
        result = await fetch_location_data(state, config)
        planning = result.get("planning", planning)
    except Exception:
        logger.exception("initialize_session: failed to fetch location data")
        return {}

    initial_summary: str | None = configurable.get("initial_location_summary")
    if initial_summary:
        planning = _update_planning(planning, locationSummary=initial_summary)
    elif planning and not planning.locationSummary:
        try:
            cached = await fetch_location_profile(location_id, "0")
            if cached:
                planning = _update_planning(planning, locationSummary=cached)
        except Exception:
            logger.warning("initialize_session: profile cache lookup failed; continuing without summary")

    date_start = configurable.get("date_start")
    date_end = configurable.get("date_end")
    if date_start and date_end:
        planning = _update_planning(planning, dateStart=date_start, dateEnd=date_end)

    national_holidays = configurable.get("national_holidays")
    if national_holidays:
        planning = _update_planning(planning, nationalHolidays=national_holidays)

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
    valid = ("create_instagram_campaign", "edit_venue_profile", "unknown")
    return state.intent if state.intent in valid else "unknown"


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


async def respond_with_plan(state: State) -> Dict[str, Any]:
    """Format a user-facing response from the campaign brief (full) or location profile (lite)."""
    planning = state.planning
    context_mode = planning.context_mode if planning else None

    if context_mode == "lite":
        prompt = PLAN_RESPONSE_PROMPT_LITE.format(
            message=state.message,
            date_start=planning.dateStart if planning else "unknown",
            date_end=planning.dateEnd if planning else "unknown",
        )
    else:
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
            "Please create a campaign first and I'll be able to update the profile."
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
    .add_node("run_planning_agent", planning_subgraph)
    .add_node("handle_unknown", handle_unknown)
    .add_node("handle_venue_edit", handle_venue_edit)
    .add_node("respond_with_plan", respond_with_plan)
    .add_edge("__start__", "initialize_session")
    .add_edge("initialize_session", "classify_intent")
    .add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "create_instagram_campaign": "run_planning_agent",
            "edit_venue_profile": "handle_venue_edit",
            "unknown": "handle_unknown",
        },
    )
    .add_edge("run_planning_agent", "respond_with_plan")
    .add_edge("respond_with_plan", "__end__")
    .add_edge("handle_venue_edit", "__end__")
    .add_edge("handle_unknown", "__end__")
    .compile(checkpointer=MemorySaver())
)
