"""Shared utilities for planning subgraph nodes."""

from dataclasses import replace
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig

from agent.state import NationalHoliday, PlanningState


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


def _format_holidays(holidays: list[NationalHoliday] | None) -> str:
    if not holidays:
        return "None"
    return "\n".join(
        f"- [{h.get('id')}] {h.get('date')} — {h.get('name')} ({h.get('type', 'public')})"
        for h in holidays
    )


def _format_items(items: list[dict] | None) -> str:
    if not items:
        return "None available"
    lines = []
    for item in items:
        name = item.get("menu", "Unknown item")
        action = item.get("action", "")
        cm = item.get("contributionMargin")
        cm_str = f", contribution margin: {cm}" if cm is not None else ""
        lines.append(f"- {name} (category: {action}{cm_str})")
    return "\n".join(lines)
