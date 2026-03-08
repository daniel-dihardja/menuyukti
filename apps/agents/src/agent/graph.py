import logging
from dataclasses import dataclass
from typing import Any, Dict, Literal

from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Intent category: top-level classification (extend with more later, e.g. "content")
IntentCategory = Literal["planning"]

# Define input/output state
@dataclass
class State:
    message: str
    intent_category: IntentCategory = "planning"
    response: str | None = None
    intent: str | None = None


class IntentResult(BaseModel):
    """Structured result for intent classification."""

    intent: Literal["generate_instagram_posts", "unknown"]


# Create model
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
)

intent_llm = llm.with_structured_output(IntentResult)

INTENT_PROMPT = """Intent category: {intent_category}. Classify the user message. Reply with intent 'generate_instagram_posts' only if they clearly want to create or generate Instagram posts; otherwise reply 'unknown'.

User message: {message}"""


async def classify_intent(state: State) -> Dict[str, Any]:
    """Classify user message into generate_instagram_posts or unknown."""
    logger.debug("classify_intent: input message=%r intent_category=%r", state.message, state.intent_category)
    result = await intent_llm.ainvoke(
        INTENT_PROMPT.format(message=state.message, intent_category=state.intent_category)
    )
    logger.info("classify_intent: classified intent=%s", result.intent)
    return {"intent": result.intent}


def route_by_intent(state: State) -> str:
    """Route to handler based on classified intent."""
    branch = state.intent if state.intent in ("generate_instagram_posts", "unknown") else "unknown"
    logger.info("route_by_intent: intent=%s -> branch=%s", state.intent, branch)
    return branch


async def run_planning_agent(state: State) -> Dict[str, Any]:
    """Planning agent: output markdown that mentions planning."""
    logger.info("run_planning_agent: returning planning markdown")
    markdown = (
        "# Planning\n\n"
        f"Planning for your request: {state.message}\n\n"
        "*Plan details can be added here.*"
    )
    return {"response": markdown}


async def handle_unknown(state: State) -> Dict[str, Any]:
    """Respond when intent is unknown."""
    return {
        "response": "I didn't understand. I can help you generate Instagram posts."
    }


# Build graph
graph = (
    StateGraph(State)
    .add_node("classify_intent", classify_intent)
    .add_node("run_planning_agent", run_planning_agent)
    .add_node("handle_unknown", handle_unknown)
    .add_edge("__start__", "classify_intent")
    .add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "generate_instagram_posts": "run_planning_agent",
            "unknown": "handle_unknown",
        },
    )
    .add_edge("run_planning_agent", "__end__")
    .add_edge("handle_unknown", "__end__")
    .compile()
)
