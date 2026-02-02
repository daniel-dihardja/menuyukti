from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from typing_extensions import TypedDict


class Context(TypedDict):
    my_configurable_param: str


@dataclass
class State:
    title: str = "example"


def process_input(
    state: State,
    my_configurable_param: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "title": (
            "output from process_input. " f"Configured with {my_configurable_param}"
        )
    }


async def call_model(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    return process_input(
        state=state,
        my_configurable_param=(runtime.context or {}).get("my_configurable_param"),
    )


graph = (
    StateGraph(State, context_schema=Context)
    .add_node(call_model)
    .add_edge("__start__", "call_model")
    .compile(name="New Graph")
)
