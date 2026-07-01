"""State schema for dedicated post_lineup milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

from agents_app.agents.core.milestone_run.dates_window import CampaignWeek


class PostLineupSlide(TypedDict):
    dishName: str
    imageBrief: str
    caption: NotRequired[str]
    role: NotRequired[Literal["star", "puzzle"]]
    category: NotRequired[str]
    storytellingFit: NotRequired[Literal["strong", "weak"]]
    popularity: NotRequired[float]


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
    intent: Literal["top_five_category", "weekday_lunch_post"]
    title: str
    slides: list[PostLineupSlide]
    description: NotRequired[str]
    captionGuidance: NotRequired[str]
    category: NotRequired[str]
    intervalWeeks: NotRequired[int]
    groupIds: NotRequired[list[str]]
    date: NotRequired[str]
    fixdate: NotRequired[bool]
    scheduleHints: NotRequired[PostLineupScheduleHints]


class PostLineupOutput(TypedDict):
    posts: list[PostLineupPost]
    startDate: NotRequired[str]
    endDate: NotRequired[str]
    sourceMenuClustererTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]
    sourceMenuTaggerTitle: NotRequired[str]
    sourceDatesTitle: NotRequired[str]
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
    dates_data: NotRequired[dict[str, Any]]
    start_date: NotRequired[str]
    end_date: NotRequired[str]
    source_dates_title: NotRequired[str]
    campaign_weeks: NotRequired[list[CampaignWeek]]
    campaign_brief_data: NotRequired[dict[str, Any]]
    source_campaign_brief_title: NotRequired[str]
    groups: NotRequired[list[dict[str, Any]]]
    food_leads: NotRequired[list[dict[str, Any]]]
    source_menu_clusterer_title: NotRequired[str]
    menu_clusterer_data: NotRequired[dict[str, Any]]
    menu_tagger_data: NotRequired[dict[str, Any]]
    source_menu_tagger_title: NotRequired[str]
    top_five_categories: NotRequired[list[dict[str, Any]]]
    top_five_posts: NotRequired[list[dict[str, Any]]]
    generated_output: NotRequired[PostLineupOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
