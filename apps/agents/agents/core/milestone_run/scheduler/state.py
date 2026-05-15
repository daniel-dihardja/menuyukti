"""State schema for dedicated scheduler milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class SchedulerSlot(TypedDict):
    date: str
    time: str
    title: str


class SchedulerOutput(TypedDict):
    startDate: str
    endDate: str
    publicHolidays: list[dict[str, str]]
    slots: list[SchedulerSlot]
    sourceDatesTitle: NotRequired[str]
    sourcePostLineupTitle: NotRequired[str]
    sourceStoryLineupTitle: NotRequired[str]


class SchedulerState(TypedDict):
    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    workflow_id: NotRequired[str | None]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    dates_data: NotRequired[dict[str, Any] | None]
    source_dates_title: NotRequired[str]
    story_lineup_data: NotRequired[dict[str, Any] | None]
    source_story_lineup_title: NotRequired[str]
    post_lineup_data: NotRequired[dict[str, Any] | None]
    source_post_lineup_title: NotRequired[str]
    generated_output: NotRequired[SchedulerOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | None]
    milestonedata_written: bool
