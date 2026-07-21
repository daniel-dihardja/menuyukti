"""State schema for dedicated IG Format milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


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
    # Validated IgMenuPickerMilestoneOutput.model_dump() from prior.
    prior_ig_menu_picker_data: NotRequired[dict[str, Any]]
    source_menu_picker_entries: NotRequired[list[dict[str, Any]]]
    generation_context_json: NotRequired[str]
    # Validated IgFormatMilestoneOutput.model_dump() after generation.
    generated_output: NotRequired[dict[str, Any] | None]
    result_data: str
    raw_data: NotRequired[str]
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
