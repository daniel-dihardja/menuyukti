"""State schema for dedicated scheduler milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class SchedulerPostSlotDetail(TypedDict):
    id: str
    format: Literal["carousel"]
    intent: Literal["top_five_category", "weekday_lunch_post"]
    title: str
    slides: list[dict[str, str]]
    groupIds: list[str]


class SchedulerReelSlotDetail(TypedDict):
    id: str
    format: Literal["reel"]
    intent: Literal["weekday_reel", "weekend_reel"]
    title: str
    description: str
    explanation: str
    groupIds: list[str]
    heroDishes: NotRequired[list[dict[str, str]]]


class SchedulerSlot(TypedDict):
    kind: Literal["story", "post", "reel"]
    date: str
    time: str
    title: str
    post: NotRequired[SchedulerPostSlotDetail]
    reel: NotRequired[SchedulerReelSlotDetail]


class SchedulerOutput(TypedDict):
    startDate: str
    endDate: str
    publicHolidays: list[dict[str, str]]
    slots: list[SchedulerSlot]
    scheduleExplanation: NotRequired[str]
    sourceDatesTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]
    sourceMenuClustererTitle: NotRequired[str]
    sourcePostLineupTitle: NotRequired[str]
    sourceStoryLineupTitle: NotRequired[str]
    sourceReelLineupTitle: NotRequired[str]


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
    campaign_brief_data: NotRequired[dict[str, Any] | None]
    source_campaign_brief_title: NotRequired[str]
    post_lineup_data: NotRequired[dict[str, Any] | None]
    source_post_lineup_title: NotRequired[str]
    story_lineup_data: NotRequired[dict[str, Any] | None]
    source_story_lineup_title: NotRequired[str]
    reel_lineup_data: NotRequired[dict[str, Any] | None]
    source_reel_lineup_title: NotRequired[str]
    generated_output: NotRequired[SchedulerOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | None]
    milestonedata_written: bool
