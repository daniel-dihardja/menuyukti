"""State schema for dedicated IGPlan milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class IgPlanOutput(TypedDict):
    planMarkdown: str
    sourceAnalyticsRunId: str
    reportingPeriod: str


class IgPlanState(TypedDict):
    """State carried through IGPlan fetch, generation, and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    location_raw: NotRequired[dict[str, Any]]
    location_profile: NotRequired[dict[str, Any]]
    analytics_run_id: NotRequired[str]
    slot_performance: NotRequired[dict[str, Any]]
    menu_engineering_matrix: NotRequired[dict[str, Any]]
    slot_menu_candidates: NotRequired[dict[str, Any]]
    allowed_menu_names: NotRequired[set[str]]
    generation_context_json: NotRequired[str]
    generated_output: NotRequired[IgPlanOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
