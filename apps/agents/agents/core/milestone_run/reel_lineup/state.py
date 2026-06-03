"""State schema for dedicated reel_lineup milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

from agents_app.agents.core.milestone_run.dates_window import CampaignWeek


class ReelLineupHeroDish(TypedDict):
    name: str
    reelMoment: NotRequired[str]
    role: NotRequired[Literal["star", "puzzle"]]
    category: NotRequired[str]
    storytellingFit: NotRequired[Literal["strong", "weak"]]
    popularity: NotRequired[float]


class ReelLineupScheduleHints(TypedDict):
    preferredWeekdays: list[
        Literal[
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
    ]
    preferredTime: str


class ReelLineupReel(TypedDict):
    id: str
    format: Literal["reel"]
    intent: Literal["weekday_reel", "weekend_reel"]
    title: str
    description: str
    explanation: str
    groupIds: list[str]
    weekIndex: NotRequired[int]
    date: NotRequired[str]
    scheduleHints: NotRequired[ReelLineupScheduleHints]
    heroDishes: NotRequired[list[ReelLineupHeroDish]]


class ReelLineupOutput(TypedDict):
    reels: list[ReelLineupReel]
    startDate: NotRequired[str]
    endDate: NotRequired[str]
    sourceMenuClustererTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]
    sourceDatesTitle: NotRequired[str]
    notes: NotRequired[str]


class ReelLineupState(TypedDict):
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
    owner_notes_markdown: NotRequired[str]
    dates_data: NotRequired[dict[str, Any]]
    start_date: NotRequired[str]
    end_date: NotRequired[str]
    source_dates_title: NotRequired[str]
    campaign_weeks: NotRequired[list[CampaignWeek]]
    campaign_brief_data: NotRequired[dict[str, Any]]
    source_campaign_brief_title: NotRequired[str]
    groups: NotRequired[list[dict[str, Any]]]
    source_menu_clusterer_title: NotRequired[str]
    generated_output: NotRequired[ReelLineupOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
