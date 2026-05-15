"""State schema for dedicated story_lineup milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class StoryLineupStory(TypedDict):
    id: str
    title: str
    date: NotRequired[str]
    fixdate: NotRequired[bool]
    reason: NotRequired[Literal["public_holiday"]]
    holidayName: NotRequired[str]


class StoryLineupOutput(TypedDict):
    stories: list[StoryLineupStory]
    sourceDatesTitle: NotRequired[str]


class StoryLineupState(TypedDict):
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
    holiday_greeting_picks: NotRequired[list[dict[str, str]]]
    generated_output: NotRequired[StoryLineupOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | None]
    milestonedata_written: bool
