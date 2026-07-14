"""State schema for dedicated IG Text milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class IgTextField(TypedDict):
    field: str
    value: str


class IgTextEntry(TypedDict):
    day: str
    slot: str
    objective: str
    pillar: str
    mealPeriod: str
    productRole: str
    slotStrategy: str
    slotKey: str
    menuItems: list[dict[str, str]]
    type: str
    formatRationale: NotRequired[str]
    texts: list[IgTextField]


class IgTextOutput(TypedDict):
    scheduleExplanation: str
    entries: list[IgTextEntry]
    sourceAnalyticsRunId: str
    reportingPeriod: str
    sourceIgFormatTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]


class IgTextState(TypedDict):
    """State carried through IG Text fetch, LLM generate, and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    injected_prior_context_markdown: NotRequired[str]
    prior_ig_format_row: NotRequired[dict[str, Any]]
    prior_ig_format_data: NotRequired[dict[str, Any]]
    source_ig_format_entries: NotRequired[list[dict[str, Any]]]
    source_campaign_brief_title: NotRequired[str]
    generation_context_json: NotRequired[str]
    generated_output: NotRequired[IgTextOutput | None]
    result_data: str
    raw_data: NotRequired[str]
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
