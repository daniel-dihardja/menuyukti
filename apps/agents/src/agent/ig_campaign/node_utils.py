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


def _sort_items(items: list[dict]) -> list[dict]:
    """Sort items by contributionMargin × quantity descending (highest-value first)."""
    def _priority(item: dict) -> float:
        cm = item.get("contributionMargin") or 0
        qty = item.get("quantity") or 0
        return float(cm) * float(qty)
    return sorted(items, key=_priority, reverse=True)


def _format_items_for_selection(items: list[dict] | None) -> str:
    """Full item context for the format-assignment LLM.

    Includes quantity, menuCategoryDetail, and contributionMargin so the LLM
    can make data-driven ranking, grouping, and distribution decisions.
    """
    if not items:
        return "None available"
    lines = []
    for item in _sort_items(items):
        name = item.get("menu", "Unknown item")
        action = item.get("action", "")
        detail = item.get("menuCategoryDetail", "")
        qty = item.get("quantity")
        cm = item.get("contributionMargin")
        detail_str = f" · {detail}" if detail else ""
        qty_str = f" · qty: {qty}" if qty is not None else ""
        cm_str = f" · CM: {cm}" if cm is not None else ""
        lines.append(f"- {name} ({action}{detail_str}{qty_str}{cm_str})")
    return "\n".join(lines)


def _format_items_for_brief(items: list[dict] | None) -> str:
    """Leaner item context for the campaign brief LLM.

    Drops quantity (item selection already done). Keeps menuCategoryDetail for
    culinary context and contributionMargin for caption tone calibration.
    """
    if not items:
        return "None available"
    lines = []
    for item in _sort_items(items):
        name = item.get("menu", "Unknown item")
        action = item.get("action", "")
        detail = item.get("menuCategoryDetail", "")
        cm = item.get("contributionMargin")
        detail_str = f" · {detail}" if detail else ""
        cm_str = f" · CM: {cm}" if cm is not None else ""
        lines.append(f"- {name} ({action}{detail_str}{cm_str})")
    return "\n".join(lines)
