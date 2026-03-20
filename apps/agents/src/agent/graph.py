from typing import Any, Dict, Literal

from langgraph.graph import StateGraph
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

from agent.config import LLM_MODEL
from agent.ig_campaign import planning_subgraph
from agent.ig_campaign.handle_ask import handle_ask
from agent.state import IntentCategory, State


class IntentResult(BaseModel):
    """Structured result for intent classification."""

    intent: Literal["create_instagram_campaign", "unknown"]


llm = ChatOpenAI(
    model=LLM_MODEL,
    temperature=0.7,
)

intent_llm = ChatOpenAI(model=LLM_MODEL, temperature=0).with_structured_output(IntentResult)

INTENT_SYSTEM = (
    "You are an intent classifier. Classify the user message into exactly one of:\n"
    "- 'create_instagram_campaign': user is EXPLICITLY requesting to create, generate, "
    "build, or start a new Instagram campaign or post schedule right now\n"
    "- 'unknown': anything else — including questions about Instagram, how-to questions, "
    "general conversation, follow-up questions, or requests for advice\n\n"
    "Examples of 'create_instagram_campaign': "
    "'create a campaign', 'generate my posts', 'build a schedule', 'start a campaign for next month'\n"
    "Examples of 'unknown': "
    "'how do I create posts?', 'what should I post?', 'tell me about my restaurant', "
    "'how does this work?', 'what can you do?'\n\n"
    "Intent category hint: {intent_category}"
)

HANDLE_UNKNOWN_SYSTEM = (
    "You are a helpful Instagram marketing assistant for a restaurant. "
    "Answer the user's question conversationally and helpfully. "
    "If the user asks how to create posts or a campaign, explain that they can ask you to "
    "'create a campaign' or 'generate my posts' and you will build a full content schedule. "
    "Keep replies concise and friendly."
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


def route_from_start(state: State) -> str:
    """Skip classify_intent entirely in ask mode — route directly to handle_ask."""
    if state.chat_mode == "ask":
        return "handle_ask"
    return "classify_intent"


def route_by_intent(state: State) -> str:
    """Route after classify_intent based on the classified intent."""
    return state.intent if state.intent in ("create_instagram_campaign", "unknown") else "unknown"


async def handle_unknown(state: State) -> Dict[str, Any]:
    """Respond conversationally when the message doesn't trigger a planning intent."""
    history = list(state.messages)
    messages = (
        [SystemMessage(content=HANDLE_UNKNOWN_SYSTEM)]
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
        "messages": [],
    }


# Build graph with MemorySaver for multi-turn conversation memory
graph = (
    StateGraph(State)
    .add_node("classify_intent", classify_intent)
    .add_node("run_planning_agent", planning_subgraph)
    .add_node("handle_unknown", handle_unknown)
    .add_node("handle_ask", handle_ask)
    .add_node("respond_with_plan", respond_with_plan)
    .add_conditional_edges(
        "__start__",
        route_from_start,
        {
            "classify_intent": "classify_intent",
            "handle_ask": "handle_ask",
        },
    )
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
    .add_edge("handle_ask", "__end__")
    .add_edge("handle_unknown", "__end__")
    .compile(checkpointer=MemorySaver())
)
