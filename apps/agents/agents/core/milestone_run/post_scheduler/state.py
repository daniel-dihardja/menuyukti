"""State schema for dedicated post-scheduler milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class PostSchedulerPost(TypedDict):
    dayOfWeek: str
    date: str
    time: str
    postType: Literal["Reel", "Post"]
    contentType: Literal["Carousel", "Single"]
    promotedMenuItems: list[str]
    captionIdea: str


class PostSchedulerDaySummary(TypedDict):
    weekdayCount: int
    weekendCount: int


class PostSchedulerOutput(TypedDict):
    posts: list[PostSchedulerPost]
    daySummary: PostSchedulerDaySummary
    promotionCandidates: NotRequired[dict[str, Any] | None]


class PostSchedulerState(TypedDict):
    """State carried through dedicated post-scheduler generation and persistence."""

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
    injected_prior_context_markdown: NotRequired[str]
    scheduler_plan: NotRequired[dict[str, Any] | None]
    promotion_candidates: NotRequired[dict[str, Any] | None]
    owner_notes_markdown: NotRequired[str]
    generation_context_markdown: NotRequired[str]
    generated_output: NotRequired[PostSchedulerOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
