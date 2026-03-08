import logging
from typing import Any, Dict, Literal

from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from agent.planning import planning_subgraph
from agent.state import IntentCategory, State

logger = logging.getLogger(__name__)


class IntentResult(BaseModel):
    """Structured result for intent classification."""

    intent: Literal["create_instagram_campaign", "unknown"]


# Create model
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
)

intent_llm = llm.with_structured_output(IntentResult)

INTENT_PROMPT = """Intent category: {intent_category}. Classify the user message into one of the following intents:
- 'create_instagram_campaign': user wants to plan or create an Instagram campaign (strategy, goals, targeting, scheduling, campaign structure, etc.)
- 'unknown': the message does not clearly match either intent above

User message: {message}"""

PLAN_RESPONSE_PROMPT = """The user asked: {message}

A campaign has been planned with the following dates:
- Start date: {date_start}
- End date: {date_end}

Respond to the user confirming the campaign schedule with these exact dates."""


async def classify_intent(state: State) -> Dict[str, Any]:
    """Classify user message into create_instagram_campaign or unknown."""
    logger.debug("classify_intent: input message=%r intent_category=%r", state.message, state.intent_category)
    result = await intent_llm.ainvoke(
        INTENT_PROMPT.format(message=state.message, intent_category=state.intent_category)
    )
    logger.info("classify_intent: classified intent=%s", result.intent)
    return {"intent": result.intent}


def route_by_intent(state: State) -> str:
    """Route to handler based on classified intent."""
    branch = state.intent if state.intent in ("create_instagram_campaign", "unknown") else "unknown"
    logger.info("route_by_intent: intent=%s -> branch=%s", state.intent, branch)
    return branch


async def handle_unknown(state: State) -> Dict[str, Any]:
    """Respond when intent is unknown."""
    return {
        "response": "I didn't understand. I can help you generate Instagram posts."
    }


async def respond_with_plan(state: State) -> Dict[str, Any]:
    """Format a user-facing response from the computed planning dates."""
    logger.info(
        "respond_with_plan: dateStart=%s dateEnd=%s",
        state.planning.dateStart if state.planning else None,
        state.planning.dateEnd if state.planning else None,
    )
    prompt = PLAN_RESPONSE_PROMPT.format(
        message=state.message,
        date_start=state.planning.dateStart,
        date_end=state.planning.dateEnd,
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
