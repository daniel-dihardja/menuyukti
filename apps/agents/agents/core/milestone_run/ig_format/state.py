"""State schema for dedicated IG Format milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class IgFormatMenuItem(TypedDict):
    menu: str
    rationale: str


class IgFormatEntry(TypedDict):
    day: str
    slot: str
    objective: str
    pillar: str
    mealPeriod: str
    productRole: str
    slotStrategy: str
    slotKey: str
    menuItems: list[IgFormatMenuItem]
    type: str
    formatRationale: NotRequired[str]


class IgFormatOutput(TypedDict):
    scheduleExplanation: str
    entries: list[IgFormatEntry]
    sourceAnalyticsRunId: str
    reportingPeriod: str
    sourceIgMenuPickerTitle: NotRequired[str]


class IgFormatState(TypedDict):
    """State carried through IG Format fetch, LLM assign, and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    prior_ig_menu_picker_row: NotRequired[dict[str, Any]]
    prior_ig_menu_picker_data: NotRequired[dict[str, Any]]
    source_menu_picker_entries: NotRequired[list[dict[str, Any]]]
    generated_output: NotRequired[IgFormatOutput | None]
    result_data: str
    raw_data: NotRequired[str]
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
