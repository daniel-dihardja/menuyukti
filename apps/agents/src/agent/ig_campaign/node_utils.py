"""Shared utilities for planning subgraph nodes."""

from dataclasses import replace
from typing import Any

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig

from agent.state import NationalHoliday, PlanningState

_NO_LOCATION_CONTEXT = "No restaurant data has been loaded yet for this session."


def _build_location_context(planning: Any) -> str:
    """Summarise available planning data as a compact context block for LLM system prompts."""
    if not planning:
        return _NO_LOCATION_CONTEXT

    parts: list[str] = []

    location = planning.location
    if location:
        name = location.get("name", "")
        city = location.get("city", "")
        country = location.get("country", "")
        description = location.get("description", "")
        parts.append(f"Restaurant: {name}" + (f" ({city}, {country})" if city else ""))
        if description:
            parts.append(f"Description: {description}")

    if planning.locationSummary:
        parts.append(f"\nMarketing Profile:\n{planning.locationSummary}")

    if planning.nationalHolidays:
        holiday_names = [h.get("name") for h in planning.nationalHolidays if h.get("name")]
        if holiday_names:
            parts.append(f"Upcoming public holidays: {', '.join(holiday_names[:5])}")

    operating = planning.operatingProfile
    if operating:
        primary_period = operating.get("primaryMealPeriod", "")
        peak_days = operating.get("peakDays", [])
        if primary_period:
            parts.append(f"Primary meal period: {primary_period}")
        if peak_days:
            parts.append(f"Busiest days: {', '.join(peak_days)}")

    if planning.campaign_brief:
        brief = planning.campaign_brief
        parts.append(
            f"\nActive campaign brief: {brief.campaign_theme} | {brief.tone} | "
            f"{len(brief.post_slots)} posts from {planning.dateStart} to {planning.dateEnd}"
        )

    return "\n".join(parts) if parts else _NO_LOCATION_CONTEXT


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
