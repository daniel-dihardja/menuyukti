from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from typing_extensions import TypedDict


class Context(TypedDict):
    my_configurable_param: str


@dataclass
class State:
    title: str = "example"


async def call_model(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    my_configurable_param = (runtime.context or {}).get("my_configurable_param")
    return {
        "title": (
            "output from process_input. " f"Configured with {my_configurable_param}"
        )
    }


graph = (
    StateGraph(State, context_schema=Context)
    .add_node(call_model)
    .add_edge("__start__", "call_model")
    .compile(name="New Graph")
)
