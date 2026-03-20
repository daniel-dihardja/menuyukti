from typing import Any, Dict, Literal

from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from agent.config import LLM_MODEL
from agent.ig_campaign import planning_subgraph
from agent.state import IntentCategory, State


class IntentResult(BaseModel):
    """Structured result for intent classification."""

    intent: Literal["create_instagram_campaign", "unknown"]


llm = ChatOpenAI(
    model=LLM_MODEL,
    temperature=0.7,
)

intent_llm = ChatOpenAI(model=LLM_MODEL, temperature=0).with_structured_output(IntentResult)

INTENT_PROMPT = """Intent category: {intent_category}. Classify the user message into one of the following intents:
- 'create_instagram_campaign': user wants to create an Instagram campaign (strategy, goals, targeting, scheduling, campaign structure, etc.)
- 'unknown': the message does not clearly match either intent above

User message: {message}"""

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


async def classify_intent(state: State) -> Dict[str, Any]:
    """Classify user message into create_instagram_campaign or unknown."""
    result = await intent_llm.ainvoke(
        INTENT_PROMPT.format(message=state.message, intent_category=state.intent_category)
    )
    return {"intent": result.intent}


def route_by_intent(state: State) -> str:
    """Route to handler based on classified intent."""
    return state.intent if state.intent in ("create_instagram_campaign", "unknown") else "unknown"


async def handle_unknown(state: State) -> Dict[str, Any]:
    """Respond when intent is unknown."""
    return {
        "response": "I didn't understand. I can help you generate Instagram posts."
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
    return {"response": result.content}


# Build graph
graph = (
    StateGraph(State)
    .add_node("classify_intent", classify_intent)
    .add_node("run_planning_agent", planning_subgraph)
    .add_node("handle_unknown", handle_unknown)
    .add_node("respond_with_plan", respond_with_plan)
    .add_edge("__start__", "classify_intent")
    .add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "create_instagram_campaign": "run_planning_agent",
            "unknown": "handle_unknown",
        },
    )
    .add_edge("run_planning_agent", "respond_with_plan")
    .add_edge("respond_with_plan", "__end__")
    .add_edge("handle_unknown", "__end__")
    .compile()
)
