"""Shared utilities for planning subgraph nodes."""

from dataclasses import replace
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig

from agent.state import PlanningState


def _update_planning(planning: PlanningState | None, **kwargs: Any) -> PlanningState:
    """Return an updated PlanningState, creating a new one if none exists yet."""
    return replace(planning, **kwargs) if planning else PlanningState(**kwargs)


async def _emit(step: str, status: str, label: str, config: RunnableConfig) -> None:
    """Dispatch a named activity event to the LangGraph callback stream."""
    await adispatch_custom_event(
        "activity",
        {"step": step, "status": status, "label": label},
        config=config,
    )
