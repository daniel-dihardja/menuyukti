"""State schema for dedicated post_lineup milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class PostLineupSlide(TypedDict):
    dishName: str
    imageBrief: str
    role: NotRequired[Literal["star", "puzzle"]]
    category: NotRequired[str]


class PostLineupScheduleHints(TypedDict):
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


class PostLineupPost(TypedDict):
    id: str
    format: Literal["carousel"]
    intent: Literal["pinned_monthly_menu", "weekday_lunch_post"]
    title: str
    slides: list[PostLineupSlide]
    groupIds: list[str]
    scheduleHints: NotRequired[PostLineupScheduleHints]


class PostLineupOutput(TypedDict):
    posts: list[PostLineupPost]
    sourceMenuClustererTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]
    notes: NotRequired[str]


class PostLineupState(TypedDict):
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
    campaign_brief_data: NotRequired[dict[str, Any]]
    source_campaign_brief_title: NotRequired[str]
    groups: NotRequired[list[dict[str, Any]]]
    food_leads: NotRequired[list[dict[str, Any]]]
    source_menu_clusterer_title: NotRequired[str]
    generated_output: NotRequired[PostLineupOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
