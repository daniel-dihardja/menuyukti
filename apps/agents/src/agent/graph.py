from dataclasses import dataclass
from typing import Dict, Any

from langgraph.graph import StateGraph
from langchain_openai import ChatOpenAI


# Define input/output state
@dataclass
class State:
    message: str
    response: str | None = None


# Create model
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7
)


async def assistant(state: State) -> Dict[str, Any]:
    """Simple assistant node that calls the LLM."""

    result = await llm.ainvoke(state.message)

    return {
        "response": result.content
    }


# Build graph
graph = (
    StateGraph(State)
    .add_node("assistant", assistant)
    .add_edge("__start__", "assistant")
    .compile()
)