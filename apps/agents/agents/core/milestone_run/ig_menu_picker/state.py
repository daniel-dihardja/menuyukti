"""State schema for dedicated IG Menu Picker milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class IgMenuPickerMenuItem(TypedDict):
    menu: str
    rationale: str


class IgMenuPickerEntry(TypedDict):
    day: str
    slot: str
    objective: str
    pillar: str
    mealPeriod: str
    productRole: str
    slotStrategy: str
    slotKey: str
    menuItems: list[IgMenuPickerMenuItem]


class IgMenuPickerOutput(TypedDict):
    scheduleExplanation: str
    entries: list[IgMenuPickerEntry]
    sourceAnalyticsRunId: str
    reportingPeriod: str
    sourceIgPlanTitle: NotRequired[str]


class IgMenuPickerState(TypedDict):
    """State carried through IG Menu Picker fetch, LLM pick, and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    analytics_run_id: NotRequired[str]
    prior_ig_plan_row: NotRequired[dict[str, Any]]
    prior_ig_plan_data: NotRequired[dict[str, Any]]
    selected_plan_entries: NotRequired[list[dict[str, Any]]]
    menu_engineering_matrix: NotRequired[dict[str, Any]]
    slot_menu_candidates: NotRequired[dict[str, Any]]
    generation_context_json: NotRequired[str]
    generated_output: NotRequired[IgMenuPickerOutput | None]
    result_data: str
    raw_data: NotRequired[str]
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
